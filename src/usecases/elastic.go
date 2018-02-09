package usecases

import (
	"log"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
)

type Legs struct {
	LegsB []entity.ElasticCdr "json:legs_b"
}

type CheckCalls func(bulkCount uint32)

func (interactor *CdrInteractor) RunElastic() {
	if interactor.ElasticCdrBRepository == nil || interactor.ElasticCdrARepository == nil || interactor.SqlCdrBRepository == nil || interactor.SqlCdrARepository == nil {
		return
	}
	elasticConfig := conf.GetElastic()
	if !elasticConfig.Enabled {
		return
	}
	go LegListener(interactor.CheckCallsFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount)
	go LegListener(interactor.CheckLegsFromSql, elasticConfig.RequestTimeout, elasticConfig.BulkCount)
	log.Println("Elastic module: start listening...")
}

func LegListener(checkCalls CheckCalls, timeout uint32, bulkCount uint32) {
	promise := time.Millisecond * time.Duration(timeout)
	ticker := time.NewTicker(promise)
	for {
		<-ticker.C
		go checkCalls(bulkCount)
	}
}

func (interactor *CdrInteractor) CheckCallsFromSql(bulkCount uint32) {
	var calls []entity.ElasticCdr
	cdr, err := interactor.SqlCdrARepository.SelectPackByState(bulkCount, 0, "stored")
	if err != nil {
		log.Println(err)
		return
	}
	if len(cdr) == 0 {
		//log.Println("Elastic module: listening Leg A from pg...")
		return
	}
	if err := interactor.SqlCdrARepository.UpdateState(cdr, 1, 0, "stored"); err != nil {
		log.Println(err)
		return
	}
	var (
		eCall entity.ElasticCdr
		iCall interface{}
	)
	for _, item := range cdr {
		iCall, err = readBytes(item.Event)
		if err != nil {
			interactor.SqlCdrARepository.UpdateState(cdr, 0, 0, "stored")
			log.Println(err)
			return
		}
		eCall, err = ParseToCdr(iCall)
		if err != nil {
			interactor.SqlCdrARepository.UpdateState(cdr, 0, 0, "stored")
			log.Println(err)
			return
		}
		calls = append(calls, eCall)
	}
	if err := interactor.ElasticCdrARepository.InsertDocs(calls); err != nil {
		interactor.SqlCdrARepository.UpdateState(cdr, 0, 0, "stored")
		log.Println(err)
	} else {
		log.Printf("Elastic: items stored [%s, %v]", "Leg A", len(calls))
		interactor.SqlCdrARepository.UpdateState(cdr, 2, uint64(time.Now().UnixNano()/1000000), "stored")
	}
	//log.Println("Elastic module: listening Leg A from pg...")
}

func (interactor *CdrInteractor) CheckLegsFromSql(bulkCount uint32) {
	var calls []entity.ElasticCdr
	cdr, err := interactor.SqlCdrBRepository.SelectPackByState(bulkCount, 0, "stored")
	if err != nil {
		log.Println(err)
		return
	}
	if len(cdr) == 0 {
		//log.Println("Elastic module: listening Leg B from pg...")
		return
	}
	if err := interactor.SqlCdrBRepository.UpdateState(cdr, 1, 0, "stored"); err != nil {
		log.Println(err)
		return
	}
	var (
		eCall entity.ElasticCdr
		iCall interface{}
	)
	for _, item := range cdr {
		iCall, err = readBytes(item.Event)
		if err != nil {
			interactor.SqlCdrBRepository.UpdateState(cdr, 0, 0, "stored")
			log.Println(err)
			return
		}
		eCall, err = ParseToCdr(iCall)
		if err != nil {
			interactor.SqlCdrBRepository.UpdateState(cdr, 0, 0, "stored")
			log.Println(err)
			return
		}
		calls = append(calls, eCall)
	}
	if err := interactor.ElasticCdrBRepository.InsertDocs(calls); err != nil {
		interactor.SqlCdrBRepository.UpdateState(cdr, 0, 0, "stored")
		log.Println(err)
	} else {
		log.Printf("Elastic: items stored [%s, %v]", "Leg B", len(calls))
		interactor.SqlCdrBRepository.UpdateState(cdr, 2, uint64(time.Now().UnixNano()/1000000), "stored")
	}
	//log.Println("Elastic module: listening Leg B from pg...")
}
