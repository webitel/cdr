package usecases

import (
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
			go interactor.ArchiveListener(interactor.AmqReceiverRepositoryA, interactor.SqlCdrARepository, interval, size, receiver.ExchangeName, receiver.RoutingKeyA, errChanA)
			logger.Notice("Archive module: start listening A...")
			<-errChanA
		}
	}(receiver, size, interval)
	go func(receiver conf.Broker, size, interval uint32) {
		for {
			errChanB := make(chan bool)
			interactor.AmqReceiverRepositoryB.CreateAmqConnection(receiver.ConnectionString, receiver.ExchangeName, receiver.ExchangeType)
			go interactor.ArchiveListener(interactor.AmqReceiverRepositoryB, interactor.SqlCdrBRepository, interval, size, receiver.ExchangeName, receiver.RoutingKeyB, errChanB)
			logger.Notice("Archive module: start listening B...")
			<-errChanB
		}
	}(receiver, size, interval)
}

func (interactor *CdrInteractor) ArchiveListener(amqpRepo entity.AmqReceiverRepository, repo entity.SqlCdrRepository, timeout uint32, bulkCount uint32, exchName, routingKey string, errChan chan bool) {
	promise := time.Millisecond * time.Duration(timeout)
	ticker := time.NewTicker(promise)
	for range ticker.C {
		go interactor.CheckCallsFromSqlByArchived(amqpRepo, repo, bulkCount, exchName, routingKey, errChan, ticker)
	}
}

func (interactor *CdrInteractor) CheckCallsFromSqlByArchived(amqpRepo entity.AmqReceiverRepository, repo entity.SqlCdrRepository, bulkCount uint32, exchName, routingKey string, errChan chan bool, ticker *time.Ticker) {
	cdr, err := repo.SelectPackByState(bulkCount, 0, "archived")
	if err != nil {
		logger.Error(err.Error())
		return
	}
	if len(cdr) == 0 {
		return
	}
	if err := repo.UpdateState(cdr, 1, 0, "archived"); err != nil {
		logger.Error(err.Error())
		return
	}
	if err := amqpRepo.SendMessage(cdr, routingKey, exchName); err != nil {
		repo.UpdateState(cdr, 0, 0, "archived")
		logger.Error(err.Error())
		ticker.Stop()
		errChan <- true
	} else {
		logger.Notice("Archive: items stored [%s, %v]", routingKey, len(cdr))
		repo.UpdateState(cdr, 2, uint64(time.Now().UnixNano()/1000000), "archived")
	}
}
