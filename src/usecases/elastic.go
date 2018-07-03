package usecases

import (
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

type CheckCalls func(bulkCount uint32, state uint8, sem chan struct{})

func (interactor *CdrInteractor) RunElastic() {
	if interactor.ElasticCdrBRepository == nil || interactor.ElasticCdrARepository == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}
	elasticConfig := conf.GetElastic()
	if !elasticConfig.Enable {
		return
	}
	maxGr := conf.MaxGoroutines()
	go LegListener(interactor.CheckLegsAFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount, maxGr)
	go LegListener(interactor.CheckLegsBFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount, maxGr)
	logger.Log("Elastic: start listening...")
}

func LegListener(checkCalls CheckCalls, timeout, bulkCount, maxGr uint32) {
	promise := time.Millisecond * time.Duration(timeout)
	ticker := time.NewTicker(promise)
	errorTicker := time.NewTicker(promise * 10)
	sem := make(chan struct{}, maxGr)
	for {
		sem <- struct{}{}
		select {
		case <-ticker.C:
			{
				go checkCalls(bulkCount, 0, sem)
			}
		case <-errorTicker.C:
			{
				go checkCalls(bulkCount, 4, sem)
			}
		}
	}
}

func (interactor *CdrInteractor) CheckLegsAFromSql(bulkCount uint32, state uint8, sem chan struct{}) {
	cdr, err := interactor.SqlCdrARepository.SelectPackByState(bulkCount, state, "elastic")
	if err != nil {
		logger.Error(err.Error())
		<-sem
		return
	}
	if len(cdr) == 0 {
		<-sem
		return
	}
	calls, err := getCalls(interactor.SqlCdrARepository, cdr)
	if err != nil {
		<-sem
		return
	}
	if err, errCalls, succCalls := interactor.ElasticCdrARepository.InsertDocs(calls); err != nil {
		if errCalls != nil && len(errCalls) > 0 {
			interactor.SqlCdrARepository.UpdateState(errCalls, 4, "elastic")
			if succCalls != nil && len(succCalls) > 0 {
				interactor.SqlCdrARepository.DeleteFromQueue(succCalls, "elastic")
				logger.Info("Elastic: items stored [%s, %v]", "Leg A", len(succCalls))
			}
			logger.Warning("Elastic: failed to store items [%s, %v]", "Leg A", len(errCalls))
		} else {
			interactor.SqlCdrARepository.UpdateState(cdr, 4, "elastic")
			logger.Warning("Elastic: failed to store items [%s, %v]", "Leg A", len(calls))
		}
	} else {
		logger.Info("Elastic: items stored [%s, %v]", "Leg A", len(calls))
		interactor.SqlCdrARepository.DeleteFromQueue(cdr, "elastic")
	}
	<-sem
}

func (interactor *CdrInteractor) CheckLegsBFromSql(bulkCount uint32, state uint8, sem chan struct{}) {
	cdr, err := interactor.SqlCdrBRepository.SelectPackByState(bulkCount, state, "elastic")
	if err != nil {
		logger.Error(err.Error())
		<-sem
		return
	}
	if len(cdr) == 0 {
		<-sem
		return
	}
	calls, err := getCalls(interactor.SqlCdrBRepository, cdr)
	if err != nil {
		<-sem
		return
	}
	if err, errCalls, succCalls := interactor.ElasticCdrBRepository.InsertDocs(calls); err != nil {
		if errCalls != nil && len(errCalls) > 0 {
			interactor.SqlCdrBRepository.UpdateState(errCalls, 4, "elastic")
			if succCalls != nil && len(succCalls) > 0 {
				interactor.SqlCdrBRepository.DeleteFromQueue(succCalls, "elastic")
				logger.Info("Elastic: items stored [%s, %v]", "Leg B", len(succCalls))
			}
			logger.Warning("Elastic: failed to store items [%s, %v]", "Leg B", len(errCalls))
		} else {
			interactor.SqlCdrBRepository.UpdateState(cdr, 4, "elastic")
			logger.Warning("Elastic: failed to store items [%s, %v]", "Leg A", len(calls))
		}
	} else {
		logger.Info("Elastic: items stored [%s, %v]", "Leg B", len(calls))
		interactor.SqlCdrBRepository.DeleteFromQueue(cdr, "elastic")
	}
	<-sem
}

func getCalls(repo entity.SqlCdrRepository, cdr []*entity.SqlCdr) ([]*entity.ElasticCdr, error) {
	var calls []*entity.ElasticCdr
	var (
		//eCall entity.ElasticCdr
		iCall interface{}
		err   error
	)
	for _, item := range cdr {
		iCall, err = readBytes(item.Event)
		if err != nil {
			repo.UpdateState(cdr, 4, "elastic")
			logger.Error(err.Error())
			return nil, err
		}
		eCall, err := ParseToCdr(iCall)
		if err != nil {
			repo.UpdateState(cdr, 4, "elastic")
			logger.Error(err.Error())
			return nil, err
		}
		calls = append(calls, &eCall)
	}
	return calls, nil
}
