package usecases

import (
	"fmt"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

type ElasticProcess func(deliveries []entity.Delivery) error

func (interactor *CdrInteractor) RunArchiveServer() {
	if interactor.AmqPublisherRepository == nil || interactor.ElasticCdrARepository == nil || interactor.ElasticCdrBRepository == nil {
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
		}
		msgsB, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyB)
		if err != nil {
			logger.Error(err.Error())
		}
		go interactor.ArchiveListenEvents(msgsA, size, interval, done, interactor.AddToElasticA, "Leg A")
		go interactor.ArchiveListenEvents(msgsB, size, interval, done, interactor.AddToElasticB, "Leg B")
		logger.Notice("RabbitMQ: start listening...")
		err = <-done
		logger.Error(err.Error())
	}
}

func (interactor *CdrInteractor) ArchiveListenEvents(msgs <-chan entity.Delivery, size, interval uint32, done chan error, elasticProcess ElasticProcess, key string) {
	batch := make([]entity.Delivery, 0, size)
	promise := time.Millisecond * time.Duration(interval)
	tmr := time.NewTimer(promise)
	for {
		select {
		case <-tmr.C:
			{
				if len(batch) > 0 {
					go interactor.ArchiveDeliveryProcess(batch, elasticProcess, key)
					batch = make([]entity.Delivery, 0, size)
				}
				tmr.Reset(promise)
				//log.Printf("RabbitMQ: listening [%s]...\n", key)
			}
		case d, ok := <-msgs:
			{
				batch = append(batch, d)
				if len(batch) == cap(batch) {
					go interactor.ArchiveDeliveryProcess(batch, elasticProcess, key)
					batch = make([]entity.Delivery, 0, size)
					tmr.Reset(promise)
					//log.Printf("listening\n")
				}
				if !ok {
					if len(batch) > 0 && len(batch) != cap(batch) {
						go interactor.ArchiveDeliveryProcess(batch, elasticProcess, key)
					}
					done <- fmt.Errorf("ERROR: Deliveries channel closed")
					return
				}
			}
		}
	}
}

func (interactor *CdrInteractor) ArchiveDeliveryProcess(batch []entity.Delivery, elasticProcess ElasticProcess, key string) {
	if err := elasticProcess(batch); err != nil {
		logger.Error("ERROR. %s: %s", key, err)
		for i := 0; i < len(batch); i++ {
			batch[i].Nack(false, true)
		}
		logger.Error("Elastic: failed to store items [%s, %v]", key, len(batch))
	} else {
		for i := 0; i < len(batch); i++ {
			batch[i].Ack(false)
		}
		logger.Notice("Elastic: items stored [%s, %v]", key, len(batch))
	}
	//log.Printf("RabbitMQ: listening [%s]...\n", key)
}

func (interactor *CdrInteractor) AddToElasticA(deliveries []entity.Delivery) error {
	var calls []entity.ElasticCdr
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err
		}
		eCall, err := ParseToCdr(call)
		if err != nil {
			//	interactor.SqlCdrARepository.UpdateState(cdr, 0, 0, "stored")
			return err
		}
		calls = append(calls, eCall)
	}
	err := interactor.ElasticCdrARepository.InsertDocs(calls)
	return err
}

func (interactor *CdrInteractor) AddToElasticB(deliveries []entity.Delivery) error {
	var calls []entity.ElasticCdr
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err
		}
		eCall, err := ParseToCdr(call)
		if err != nil {
			//	interactor.SqlCdrARepository.UpdateState(cdr, 0, 0, "stored")
			return err
		}
		calls = append(calls, eCall)
	}
	err := interactor.ElasticCdrBRepository.InsertDocs(calls)
	return err
}
