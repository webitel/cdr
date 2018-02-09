package main

import (
	"webitel.com/cdr_service/conf"
	"webitel.com/cdr_service/infrastructure"
	"webitel.com/cdr_service/interfaces"
	"webitel.com/cdr_service/usecases"
)

func main() {
	conf.InitConfig()
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
	if err == nil {
		dbHandlers := make(map[string]interfaces.DbHandler)
		dbHandlers["DbCdrARepo"] = dbHandler
		dbHandlers["DbCdrBRepo"] = dbHandler
		CdrInteractor.SqlCdrARepository = interfaces.NewDbCdrARepo(dbHandlers)
		CdrInteractor.SqlCdrBRepository = interfaces.NewDbCdrBRepo(dbHandlers)
		go CdrInteractor.Run()
		go CdrInteractor.RunArchivePublisher()
	}

	docHandler, err := infrastructure.NewElasticHandler()
	if err == nil {
		docHandlers := make(map[string]interfaces.NosqlHandler)
		docHandlers["DocCdrARepo"] = docHandler
		docHandlers["DocCdrBRepo"] = docHandler
		CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
		CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
		go CdrInteractor.RunElastic()
	}
}

func archiveServer() {
	CdrInteractor := new(usecases.CdrInteractor)
	amqpPublisherHandler := infrastructure.NewRabbitPublisherHandler()

	CdrInteractor.AmqPublisherRepository = interfaces.NewPublisherRepo(amqpPublisherHandler)

	docHandler, err := infrastructure.NewElasticHandler()
	if err == nil {
		docHandlers := make(map[string]interfaces.NosqlHandler)
		docHandlers["DocCdrARepo"] = docHandler
		docHandlers["DocCdrBRepo"] = docHandler
		CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
		CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
		go CdrInteractor.RunArchiveServer()
	}
}
