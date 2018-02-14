package usecases

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

type CdrInteractor struct {
	SqlCdrARepository      entity.SqlCdrARepository
	SqlCdrBRepository      entity.SqlCdrBRepository
	ElasticCdrARepository  entity.ElasticCdrARepository
	ElasticCdrBRepository  entity.ElasticCdrBRepository
	AmqPublisherRepository entity.AmqPublisherRepository
	AmqReceiverRepositoryA entity.AmqReceiverRepository
	AmqReceiverRepositoryB entity.AmqReceiverRepository
}

type SqlProcess func(deliveries []entity.Delivery) error

func (interactor *CdrInteractor) InitTables() error {
	if err := interactor.SqlCdrARepository.CreateTableIfNotExist(); err != nil {
		return fmt.Errorf("PostgreSQL. Table A creating error: " + err.Error())
	}
	if err := interactor.SqlCdrBRepository.CreateTableIfNotExist(); err != nil {
		return fmt.Errorf("PostgreSQL. Table B creating error: " + err.Error())
	}
	return nil
}

func (interactor *CdrInteractor) Run() {
	if interactor.AmqPublisherRepository == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}

	publisher := conf.GetPublisher()
	size, interval := conf.GetListenerConfig()
	for {
		var done = make(chan error)
		interactor.AmqPublisherRepository.CreateAmqConnection(publisher.ConnectionString, publisher.ExchangeName, publisher.ExchangeType)
		msgsA, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyA)
		if err != nil {
			logger.Error(err.Error())
			continue
		}
		msgsB, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyB)
		if err != nil {
			logger.Error(err.Error())
			continue
		}
		go interactor.ListenEvents(msgsA, size, interval, done, interactor.AddToSqlA, "Leg A")
		go interactor.ListenEvents(msgsB, size, interval, done, interactor.AddToSqlB, "Leg B")
		logger.Notice("RabbitMQ: start listening...")
		err = <-done
		logger.Error(err.Error())
	}
}

func (interactor *CdrInteractor) ListenEvents(msgs <-chan entity.Delivery, size, interval uint32, done chan error, sqlProcess SqlProcess, key string) {
	batch := make([]entity.Delivery, 0, size)
	promise := time.Millisecond * time.Duration(interval)
	tmr := time.NewTimer(promise)
	for {
		select {
		case <-tmr.C:
			{
				if len(batch) > 0 {
					go interactor.DeliveryProcess(batch, sqlProcess, key)
					batch = make([]entity.Delivery, 0, size)
				}
				tmr.Reset(promise)
				//log.Printf("RabbitMQ: listening [%s]...\n", key)
			}
		case d, ok := <-msgs:
			{
				batch = append(batch, d)
				if len(batch) == cap(batch) {
					go interactor.DeliveryProcess(batch, sqlProcess, key)
					batch = make([]entity.Delivery, 0, size)
					tmr.Reset(promise)
				}
				if !ok {
					if len(batch) > 0 && len(batch) != cap(batch) {
						go interactor.DeliveryProcess(batch, sqlProcess, key)
					}
					done <- fmt.Errorf("ERROR: Deliveries channel closed")
					return
				}
			}
		}
	}
}

func (interactor *CdrInteractor) DeliveryProcess(batch []entity.Delivery, sqlProcess SqlProcess, key string) {
	if err := sqlProcess(batch); err != nil {
		logger.Error("ERROR. %s: %s", key, err)
		for i := 0; i < len(batch); i++ {
			batch[i].Nack(false, true)
		}
		logger.Error("PostgreSQL: failed to store items [%s, %v]", key, len(batch))
	} else {
		for i := 0; i < len(batch); i++ {
			batch[i].Ack(false)
		}
		logger.Notice("PostgreSQL: items stored [%s, %v]", key, len(batch))
	}
	//log.Printf("RabbitMQ: listening [%s]...\n", key)
}

func (interactor *CdrInteractor) AddToSqlA(deliveries []entity.Delivery) error {
	var calls []entity.SqlCdr
	var callsB []entity.SqlCdr
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err
		}
		uuid, ok := call.(map[string]interface{})["variables"].(map[string]interface{})["uuid"].(string)
		parent := getParentUuid(call)
		if ok {
			if parent == "" {
				sql_call, err := parseToSqlA(item.GetBody(), uuid)
				if err != nil {
					return err
				}
				calls = append(calls, sql_call)
			} else {
				sql_call, err := parseToSqlB(item.GetBody(), uuid, parent)
				if err != nil {
					return err
				}
				callsB = append(callsB, sql_call)
			}
		}
	}
	if len(calls) > 0 {
		if err := interactor.SqlCdrARepository.InsertPack(calls); err != nil {
			return err
		}
	}
	if len(callsB) > 0 {
		if err := interactor.SqlCdrBRepository.InsertPack(callsB); err != nil {
			return err
		}
		logger.Notice("Count of LegB in LegA channel [%v]", len(callsB))
	}
	return nil
}

func (interactor *CdrInteractor) AddToSqlB(deliveries []entity.Delivery) error {
	var calls []entity.SqlCdr
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err
		}
		uuid, ok := call.(map[string]interface{})["variables"].(map[string]interface{})["uuid"].(string)
		parent := getParentUuid(call)
		if ok {
			sql_call, err := parseToSqlB(item.GetBody(), uuid, parent)
			if err != nil {
				return err
			}
			calls = append(calls, sql_call)
		}
	}
	if len(calls) > 0 {
		if err := interactor.SqlCdrBRepository.InsertPack(calls); err != nil {
			return err
		}
	}
	return nil
}

func getParentUuid(call interface{}) string {
	var (
		s  string
		ok bool
	)
	if s, ok = call.(map[string]interface{})["variables"].(map[string]interface{})["ent_originate_aleg_uuid"].(string); !ok {
		s, ok = call.(map[string]interface{})["variables"].(map[string]interface{})["originating_leg_uuid"].(string)
		if !ok {
			if callflow, ok := call.(map[string]interface{})["callflow"].([]interface{}); ok && len(callflow) > 0 {
				if caller_profile, ok := callflow[0].(map[string]interface{})["caller_profile"].(map[string]interface{}); ok {
					if originator, ok := caller_profile["originator"].(map[string]interface{}); ok {
						if arr, ok := originator["originator_caller_profiles"].([]interface{}); ok && len(arr) > 0 {
							s, _ = arr[0].(map[string]interface{})["uuid"].(string)
						}
					}
				}
			}
		}
	}
	return s
}

func parseToSqlA(body []byte, uuid string) (entity.SqlCdr, error) {
	pg_call := entity.SqlCdr{
		Uuid:           uuid,
		Event:          body,
		Size:           uint32(len(body)),
		Created_at:     uint64(time.Now().UnixNano() / 1000000),
		Stored_state:   0,
		Archived_state: 0,
	}
	return pg_call, nil
}

func parseToSqlB(body []byte, uuid string, parent string) (entity.SqlCdr, error) {
	pg_call := entity.SqlCdr{
		Uuid:           uuid,
		Parent_uuid:    parent,
		Event:          body,
		Size:           uint32(len(body)),
		Created_at:     uint64(time.Now().UnixNano() / 1000000),
		Stored_state:   0,
		Archived_state: 0,
	}
	return pg_call, nil
}

func readBytes(body []byte) (interface{}, error) {
	var call interface{}
	if err := json.Unmarshal(body, &call); err != nil {
		return nil, fmt.Errorf("Parse JSON error. %s", err)
	}
	return call, nil
}
