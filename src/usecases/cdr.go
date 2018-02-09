package usecases

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"webitel.com/cdr_service/conf"
	"webitel.com/cdr_service/entity"
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

func (interactor *CdrInteractor) Run() {
	if interactor.AmqPublisherRepository == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}
	// interactor.SqlCdrARepository.CreateTableIfNotExist()
	// interactor.SqlCdrBRepository.CreateTableIfNotExist()
	publisher := conf.GetPublisher()
	size, interval := conf.GetListenerConfig()
	for {
		var done = make(chan error)
		interactor.AmqPublisherRepository.CreateAmqConnection(publisher.ConnectionString, publisher.ExchangeName, publisher.ExchangeType)
		msgsA, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyA)
		if err != nil {
			log.Println(err)
			continue
		}
		msgsB, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyB)
		if err != nil {
			log.Println(err)
			continue
		}
		go interactor.ListenEvents(msgsA, size, interval, done, interactor.AddToSqlA, "Leg A")
		go interactor.ListenEvents(msgsB, size, interval, done, interactor.AddToSqlB, "Leg B")
		log.Println("RabbitMQ: start listening...")
		err = <-done
		log.Println(err)
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
		log.Printf("ERROR. %s: %s", key, err)
		for i := 0; i < len(batch); i++ {
			batch[i].Nack(false, true)
		}
		log.Printf("PostgreSQL: failed to store items [%s, %v]", key, len(batch))
	} else {
		for i := 0; i < len(batch); i++ {
			batch[i].Ack(false)
		}
		log.Printf("PostgreSQL: items stored [%s, %v]", key, len(batch))
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
	err := interactor.SqlCdrARepository.InsertPack(calls)
	if err != nil {
		return err
	}
	if len(callsB) > 0 {
		err := interactor.SqlCdrBRepository.InsertPack(callsB)
		if err != nil {
			return err
		}
		log.Printf("Count of LegB in LegA channel [%v]", len(callsB))
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
			sql_call, err := parseToSqlB(item.GetBody(), uuid, parent) //e_call.Variables["uuid"])
			if err != nil {
				return err
			}
			calls = append(calls, sql_call)
		}
	}
	err := interactor.SqlCdrBRepository.InsertPack(calls)
	if err != nil {
		return err
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
