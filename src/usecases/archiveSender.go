package usecases

import (
	"fmt"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

func (interactor *CdrInteractor) RunArchivePublisher() {
	if interactor.AmqReceiverRepositoryA == nil || interactor.AmqReceiverRepositoryB == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}
	receiver := conf.GetReceiver()
	size, interval := conf.GetReceiverConfig()
	if !receiver.Enable {
		return
	}
	go func(receiver conf.Broker, size, interval uint32) {
		for {
			errChanA := make(chan bool)
			interactor.AmqReceiverRepositoryA.CreateAmqConnection(receiver.ConnectionString, receiver.ExchangeName, receiver.ExchangeType)
			if err := interactor.AmqReceiverRepositoryA.InitExchange(receiver.ExchangeType, receiver.ExchangeName); err != nil {
				logger.Error(err.Error())
				continue
			}
			go interactor.ArchiveListener(interactor.AmqReceiverRepositoryA, interactor.SqlCdrARepository, interval, size, receiver.ExchangeName, receiver.RoutingKeyA, errChanA)
			logger.Log("Archive: start listening A...")
			<-errChanA
		}
	}(receiver, size, interval)
	go func(receiver conf.Broker, size, interval uint32) {
		for {
			errChanB := make(chan bool)
			interactor.AmqReceiverRepositoryB.CreateAmqConnection(receiver.ConnectionString, receiver.ExchangeName, receiver.ExchangeType)
			if err := interactor.AmqReceiverRepositoryB.InitExchange(receiver.ExchangeType, receiver.ExchangeName); err != nil {
				logger.Error(err.Error())
				continue
			}
			go interactor.ArchiveListener(interactor.AmqReceiverRepositoryB, interactor.SqlCdrBRepository, interval, size, receiver.ExchangeName, receiver.RoutingKeyB, errChanB)
			logger.Log("Archive: start listening B...")
			<-errChanB
		}
	}(receiver, size, interval)
}

func (interactor *CdrInteractor) ArchiveListener(amqpRepo entity.AmqReceiverRepository, repo entity.SqlCdrRepository, timeout uint32, bulkCount uint32, exchName, routingKey string, errChan chan bool) {
	promise := time.Millisecond * time.Duration(timeout)
	ticker := time.NewTicker(promise)
	errorTicker := time.NewTicker(promise * 10)
	maxGr := conf.MaxGoroutines()
	sem := make(chan struct{}, maxGr)
	for {
		sem <- struct{}{}
		select {
		case <-ticker.C:
			{
				go interactor.CheckCallsFromSqlByArchived(amqpRepo, repo, bulkCount, 0, exchName, routingKey, errChan, ticker, errorTicker, sem)
			}
		case <-errorTicker.C:
			{
				go interactor.CheckCallsFromSqlByArchived(amqpRepo, repo, bulkCount, 4, exchName, routingKey, errChan, ticker, errorTicker, sem)
			}
		}
	}
}

func (interactor *CdrInteractor) CheckCallsFromSqlByArchived(amqpRepo entity.AmqReceiverRepository, repo entity.SqlCdrRepository, bulkCount uint32, state uint8, exchName, routingKey string, errChan chan bool, ticker, errorTicker *time.Ticker, sem chan struct{}) {
	cdr, err := repo.SelectPackByState(bulkCount, state, "archive")
	if err != nil {
		logger.Error(err.Error())
		<-sem
		return
	}
	if len(cdr) == 0 {
		<-sem
		return
	}
	if err := amqpRepo.SendMessage(cdr, routingKey, exchName); err != nil {
		if amqpError, ok := err.(entity.AmqError); ok {
			logger.ErrorResponse(fmt.Sprintf("Archive [%s]:", routingKey), amqpError.Code, amqpError.Reason)
			if amqpError.Code >= 500 && amqpError.Code < 600 {
				repo.UpdateState(cdr, 0, "archive")
				ticker.Stop()
				errorTicker.Stop()
				errChan <- true
			} else {
				repo.UpdateState(cdr, 4, "archive")
			}
		} else {
			logger.Error(err.Error())
			repo.UpdateState(cdr, 4, "archive")
		}
	} else {
		logger.Info("Archive: items stored [%s, %v]", routingKey, len(cdr))
		repo.DeleteFromQueue(cdr, "archive")
	}
	<-sem
}
