package usecases

import (
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
)

type Legs struct {
	LegsB []entity.ElasticCdr "json:legs_b"
}

type CheckCalls func(bulkCount uint32, state uint8)

func (interactor *CdrInteractor) RunElastic() {
	if interactor.ElasticCdrBRepository == nil || interactor.ElasticCdrARepository == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}
	elasticConfig := conf.GetElastic()
	if !elasticConfig.Enabled {
		return
	}
	go LegListener(interactor.CheckLegsAFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount)
	go LegListener(interactor.CheckLegsBFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount)
	logger.Notice("Elastic module: start listening...")
}

func LegListener(checkCalls CheckCalls, timeout uint32, bulkCount uint32) {
	promise := time.Millisecond * time.Duration(timeout)
	ticker := time.NewTicker(promise)
	errorTicker := time.NewTicker(promise * 10)
	for {
		select {
		case <-ticker.C:
			{
				go checkCalls(bulkCount, 0)
			}
		case <-errorTicker.C:
			{
				go checkCalls(bulkCount, 4)
			}
		}

	}
}

func (interactor *CdrInteractor) CheckLegsAFromSql(bulkCount uint32, state uint8) {
	var calls []entity.ElasticCdr
	cdr, err := interactor.SqlCdrARepository.SelectPackByState(bulkCount, state, "stored")
	if err != nil {
		logger.Error(err.Error())
		return
	}
	if len(cdr) == 0 {
		//log.Println("Elastic module: listening Leg A from pg...")
		return
	}
	if err := interactor.SqlCdrARepository.UpdateState(cdr, 1, 0, "stored"); err != nil {
		logger.Error(err.Error())
		return
	}
	var (
		eCall entity.ElasticCdr
		iCall interface{}
	)
	for _, item := range cdr {
		iCall, err = readBytes(item.Event)
		if err != nil {
			interactor.SqlCdrARepository.UpdateState(cdr, 4, 0, "stored")
			logger.Error(err.Error())
			return
		}
		eCall, err = ParseToCdr(iCall)
		if err != nil {
			interactor.SqlCdrARepository.UpdateState(cdr, 4, 0, "stored")
			logger.Error(err.Error())
			return
		}
		calls = append(calls, eCall)
	}
	if err, errCalls, succCalls := interactor.ElasticCdrARepository.InsertDocs(calls); err != nil {
		if errCalls != nil && len(errCalls) > 0 {
			interactor.SqlCdrARepository.UpdateState(errCalls, 4, 0, "stored")
			if succCalls != nil && len(succCalls) > 0 {
				interactor.SqlCdrARepository.UpdateState(succCalls, 2, uint64(time.Now().UnixNano()/1000000), "stored")
			}
		} else {
			interactor.SqlCdrARepository.UpdateState(cdr, 4, 0, "stored")
		}
		logger.Error(err.Error())
	} else {
		logger.Notice("Elastic: items stored [%s, %v]", "Leg A", len(calls))
		interactor.SqlCdrARepository.UpdateState(cdr, 2, uint64(time.Now().UnixNano()/1000000), "stored")
	}
	//log.Println("Elastic module: listening Leg A from pg...")
}

func (interactor *CdrInteractor) CheckLegsBFromSql(bulkCount uint32, state uint8) {
	var calls []entity.ElasticCdr
	cdr, err := interactor.SqlCdrBRepository.SelectPackByState(bulkCount, state, "stored")
	if err != nil {
		logger.Error(err.Error())
		return
	}
	if len(cdr) == 0 {
		//log.Println("Elastic module: listening Leg B from pg...")
		return
	}
	if err := interactor.SqlCdrBRepository.UpdateState(cdr, 1, 0, "stored"); err != nil {
		logger.Error(err.Error())
		return
	}
	var (
		eCall entity.ElasticCdr
		iCall interface{}
	)
	for _, item := range cdr {
		iCall, err = readBytes(item.Event)
		if err != nil {
			interactor.SqlCdrBRepository.UpdateState(cdr, 4, 0, "stored")
			logger.Error(err.Error())
			return
		}
		eCall, err = ParseToCdr(iCall)
		if err != nil {
			interactor.SqlCdrBRepository.UpdateState(cdr, 4, 0, "stored")
			logger.Error(err.Error())
			return
		}
		calls = append(calls, eCall)
	}
	if err, errCalls, succCalls := interactor.ElasticCdrBRepository.InsertDocs(calls); err != nil {
		if errCalls != nil && len(errCalls) > 0 {
			interactor.SqlCdrBRepository.UpdateState(errCalls, 4, 0, "stored")
			if succCalls != nil && len(succCalls) > 0 {
				interactor.SqlCdrBRepository.UpdateState(succCalls, 2, uint64(time.Now().UnixNano()/1000000), "stored")
			}
		} else {
			interactor.SqlCdrBRepository.UpdateState(cdr, 4, 0, "stored")
		}
		logger.Error(err.Error())
	} else {
		logger.Notice("Elastic: items stored [%s, %v]", "Leg B", len(calls))
		interactor.SqlCdrBRepository.UpdateState(cdr, 2, uint64(time.Now().UnixNano()/1000000), "stored")
	}
	//log.Println("Elastic module: listening Leg B from pg...")
}
