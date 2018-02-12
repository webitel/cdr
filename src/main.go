package main

import (
	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/infrastructure"
	"github.com/webitel/cdr/src/interfaces"
	"github.com/webitel/cdr/src/logger"
	"github.com/webitel/cdr/src/usecases"
)

func main() {
	if err := conf.InitConfig(); err != nil {
		logger.Error(err.Error())
		return
	}
	if conf.IsArchive() {
		archiveServer()
	} else {
		defaultServer()
	}
	forever := make(chan bool)
	<-forever
}

func defaultServer() {
	interfaces.InitConfig()

	CdrInteractor := new(usecases.CdrInteractor)

	amqpPublisherHandler := infrastructure.NewRabbitPublisherHandler()
	amqpReceiverHandlerA := infrastructure.NewRabbitReceiverHandler()
	amqpReceiverHandlerB := infrastructure.NewRabbitReceiverHandler()

	CdrInteractor.AmqPublisherRepository = interfaces.NewPublisherRepo(amqpPublisherHandler)
	CdrInteractor.AmqReceiverRepositoryA = interfaces.NewReceiverRepo(amqpReceiverHandlerA)
	CdrInteractor.AmqReceiverRepositoryB = interfaces.NewReceiverRepo(amqpReceiverHandlerB)

	dbHandler, err := infrastructure.NewPostgresHandler()
	if err != nil {
		logger.Error(err.Error())
		return
	}
	dbHandlers := make(map[string]interfaces.DbHandler)
	dbHandlers["DbCdrARepo"] = dbHandler
	dbHandlers["DbCdrBRepo"] = dbHandler
	CdrInteractor.SqlCdrARepository = interfaces.NewDbCdrARepo(dbHandlers)
	CdrInteractor.SqlCdrBRepository = interfaces.NewDbCdrBRepo(dbHandlers)
	CdrInteractor.InitTables()
	go CdrInteractor.Run()
	go CdrInteractor.RunArchivePublisher()

	docHandler, err := infrastructure.NewElasticHandler()
	if err != nil {
		logger.Error(err.Error())
		return
	}
	docHandlers := make(map[string]interfaces.NosqlHandler)
	docHandlers["DocCdrARepo"] = docHandler
	docHandlers["DocCdrBRepo"] = docHandler
	CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
	CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
	go CdrInteractor.RunElastic()

}

func archiveServer() {
	CdrInteractor := new(usecases.CdrInteractor)
	amqpPublisherHandler := infrastructure.NewRabbitPublisherHandler()

	CdrInteractor.AmqPublisherRepository = interfaces.NewPublisherRepo(amqpPublisherHandler)

	docHandler, err := infrastructure.NewElasticHandler()
	if err != nil {
		logger.Error(err.Error())
		return
	}
	docHandlers := make(map[string]interfaces.NosqlHandler)
	docHandlers["DocCdrARepo"] = docHandler
	docHandlers["DocCdrBRepo"] = docHandler
	CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
	CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
	go CdrInteractor.RunArchiveServer()
}
