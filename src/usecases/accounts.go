package usecases

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

func (interactor *CdrInteractor) RunAccounts() {
	if interactor.AmqAccountRepository == nil {
		return
	}
	publisher := conf.GetAccountPublisher()
	if publisher.Enable == false {
		return
	}
	size, interval := conf.GetAccountConfig()
	for {
		var done = make(chan error)
		interactor.AmqAccountRepository.CreateAmqConnection(publisher.ConnectionString, publisher.ExchangeName, publisher.ExchangeType)
		if err := interactor.AmqAccountRepository.InitExchange(publisher.ExchangeType, publisher.ExchangeName); err != nil {
			logger.Error(err.Error())
			continue
		}
		msgs, err := interactor.AmqAccountRepository.GetMessages(publisher.ExchangeName, publisher.ExchangeType, publisher.RoutingKey)
		if err != nil {
			logger.Error(err.Error())
			continue
		}
		go interactor.ListenStatus(msgs, size, interval, done)
		logger.Log("RabbitMQ: start listening accounts...")
		err = <-done
		logger.Error(err.Error())
	}
}

func (interactor *CdrInteractor) ListenStatus(msgs <-chan entity.Delivery, size, interval uint32, done chan error) {
	batch := make([]entity.Delivery, 0, size)
	promise := time.Millisecond * time.Duration(interval)
	tmr := time.NewTimer(promise)
	for {
		select {
		case <-tmr.C:
			{
				if len(batch) > 0 {
					go interactor.AccountProcess(batch)
					batch = make([]entity.Delivery, 0, size)
				}
				tmr.Reset(promise)
			}
		case d, ok := <-msgs:
			{
				if !ok {
					if len(batch) > 0 && len(batch) != cap(batch) {
						go interactor.AccountProcess(batch)
					}
					done <- fmt.Errorf("RabbitMQ: Deliveries channel closed [ACCOUNTS]")
					return
				}
				batch = append(batch, d)
				if len(batch) == cap(batch) {
					go interactor.AccountProcess(batch)
					batch = make([]entity.Delivery, 0, size)
					tmr.Reset(promise)
				}
			}
		}
	}
}

func (interactor *CdrInteractor) AccountProcess(batch []entity.Delivery) {
	if err, dResponse := interactor.AccountSend(batch); err != nil {
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
			logger.Info("Elastic: items stored [Accounts, %v]", successCounter)
			logger.Warning("Elastic: failed to store items [Accounts, %v]", errorCounter)
		} else {
			for i := 0; i < len(batch); i++ {
				batch[i].Nack(false, true)
			}
			logger.Error(err.Error())
			logger.Warning("Elastic: failed to store items [Accounts, %v]", len(batch))
		}
	} else {
		for i := 0; i < len(batch); i++ {
			batch[i].Ack(false)
		}
		logger.Info("Elastic: items stored [Accounts, %v]", len(batch))
	}
}

func (interactor *CdrInteractor) AccountSend(batch []entity.Delivery) (error, []DeliveryResponse) {
	var accounts []entity.Account
	var deliveriesResponse []DeliveryResponse
	for _, item := range batch {
		err, acc := getAccount(item.GetBody())
		if err != nil {
			return err, nil
		}
		acc.Uuid = GenerateUuid()
		accounts = append(accounts, acc)
		deliveriesResponse = append(deliveriesResponse, DeliveryResponse{Delivery: item, Uuid: acc.Uuid})
	}
	if err, errAcc, succAcc := interactor.ElasticAccountsRepository.InsertDocs(accounts); err != nil {
		if succAcc != nil && len(errAcc) > 0 {
			for i, _ := range deliveriesResponse {
				for _, item := range succAcc {
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

func getAccount(body []byte) (error, entity.Account) {
	var acc entity.Account
	if err := json.Unmarshal(body, &acc); err != nil {
		return err, acc
	}
	return nil, acc
}
