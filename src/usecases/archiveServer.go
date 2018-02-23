package usecases

import (
	"fmt"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

type ElasticProcess func(deliveries []entity.Delivery) (error, []DeliveryResponse)

type DeliveryResponse struct {
	entity.Delivery
	Success bool
	Uuid    string
}

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
			continue
		}
		msgsB, err := interactor.AmqPublisherRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKeyB)
		if err != nil {
			logger.Error(err.Error())
			continue
		}
		go interactor.ArchiveListenEvents(msgsA, size, interval, done, interactor.AddToElasticA, "Leg A")
		go interactor.ArchiveListenEvents(msgsB, size, interval, done, interactor.AddToElasticB, "Leg B")
		logger.Log("RabbitMQ: start listening...")
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
			}
		case d, ok := <-msgs:
			{
				if !ok {
					if len(batch) > 0 && len(batch) != cap(batch) {
						go interactor.ArchiveDeliveryProcess(batch, elasticProcess, key)
					}
					done <- fmt.Errorf("RabbitMQ: Deliveries channel closed [CONSUMER]")
					return
				}
				batch = append(batch, d)
				if len(batch) == cap(batch) {
					go interactor.ArchiveDeliveryProcess(batch, elasticProcess, key)
					batch = make([]entity.Delivery, 0, size)
					tmr.Reset(promise)
				}
			}
		}
	}
}

func (interactor *CdrInteractor) ArchiveDeliveryProcess(batch []entity.Delivery, elasticProcess ElasticProcess, key string) {
	if err, dResponse := elasticProcess(batch); err != nil {
		if dResponse != nil && len(dResponse) > 0 {
			successCounter, errorCounter := 0, 0
			for i, _ := range dResponse {
				if dResponse[i].Success {
					successCounter++
					dResponse[i].Delivery.Ack(false)
				} else {
					errorCounter++
					dResponse[i].Delivery.Nack(false, true)
				}
			}
			logger.Info("Elastic: items stored [%s, %v]", key, successCounter)
			logger.Warning("Elastic: failed to store items [%s, %v]", key, errorCounter)
		} else {
			for i := 0; i < len(batch); i++ {
				batch[i].Nack(false, true)
			}
			logger.Warning("Elastic: failed to store items [%s, %v]", key, len(batch))
		}
	} else {
		for i := 0; i < len(batch); i++ {
			batch[i].Ack(false)
		}
		logger.Info("Elastic: items stored [%s, %v]", key, len(batch))
	}
}

func (interactor *CdrInteractor) AddToElasticA(deliveries []entity.Delivery) (error, []DeliveryResponse) {
	var calls []entity.ElasticCdr
	var deliveriesResponse []DeliveryResponse
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err, nil
		}
		eCall, err := ParseToCdr(call)
		if err != nil {
			return err, nil
		}
		calls = append(calls, eCall)
		deliveriesResponse = append(deliveriesResponse, DeliveryResponse{Delivery: item, Uuid: eCall.Uuid})
	}
	if err, errCalls, succCalls := interactor.ElasticCdrARepository.InsertDocs(calls); err != nil {
		if succCalls != nil && len(errCalls) > 0 {
			for i, _ := range deliveriesResponse {
				for _, item := range succCalls {
					if deliveriesResponse[i].Uuid == item.Uuid {
						deliveriesResponse[i].Success = true
					}
				}
			}
			return err, deliveriesResponse
		} else {
			return err, nil
		}
	}
	return nil, nil
}

func (interactor *CdrInteractor) AddToElasticB(deliveries []entity.Delivery) (error, []DeliveryResponse) {
	var calls []entity.ElasticCdr
	var deliveriesResponse []DeliveryResponse
	for _, item := range deliveries {
		call, err := readBytes(item.GetBody())
		if err != nil {
			return err, nil
		}
		eCall, err := ParseToCdr(call)
		if err != nil {
			return err, nil
		}
		calls = append(calls, eCall)
		deliveriesResponse = append(deliveriesResponse, DeliveryResponse{Delivery: item, Uuid: eCall.Uuid})
	}
	if err, errCalls, succCalls := interactor.ElasticCdrBRepository.InsertDocs(calls); err != nil {
		if succCalls != nil && len(errCalls) > 0 {
			for i, _ := range deliveriesResponse {
				for _, item := range succCalls {
					if deliveriesResponse[i].Uuid == item.Uuid {
						deliveriesResponse[i].Success = true
					}
				}
			}
			return err, deliveriesResponse
		} else {
			return err, nil
		}
	}
	return nil, nil
}
