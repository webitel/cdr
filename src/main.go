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
	logger.SetLevel(conf.GetLogLevel())
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

	/**
	**RABBIT HANDLERS
	**/
	amqpPublisherHandler := infrastructure.NewRabbitPublisherHandler()
	amqpAccountHandler := infrastructure.NewRabbitPublisherHandler()
	amqpReceiverHandlerA := infrastructure.NewRabbitReceiverHandler()
	amqpReceiverHandlerB := infrastructure.NewRabbitReceiverHandler()

	CdrInteractor.AmqPublisherRepository = interfaces.NewPublisherRepo(amqpPublisherHandler)
	CdrInteractor.AmqAccountRepository = interfaces.NewPublisherRepo(amqpAccountHandler)
	CdrInteractor.AmqReceiverRepositoryA = interfaces.NewReceiverRepo(amqpReceiverHandlerA)
	CdrInteractor.AmqReceiverRepositoryB = interfaces.NewReceiverRepo(amqpReceiverHandlerB)
	/*****************/

	/**
	**POSTGRE HANDLERS
	**/
	dbHandler, err := infrastructure.NewPostgresHandler()
	if err != nil {
		logger.Fatal(err.Error())
		return
	}
	dbHandlers := make(map[string]interfaces.DbHandler)
	dbHandlers["DbCdrARepo"] = dbHandler
	dbHandlers["DbCdrBRepo"] = dbHandler
	CdrInteractor.SqlCdrARepository = interfaces.NewDbCdrARepo(dbHandlers)
	CdrInteractor.SqlCdrBRepository = interfaces.NewDbCdrBRepo(dbHandlers)
	/*INIT TABLES IN PG*/
	if err := CdrInteractor.InitTables(); err != nil {
		logger.Fatal(err.Error())
		return
	}
	/*********************/

	go CdrInteractor.Run()                 // RUN RABBIT LISTENER
	go CdrInteractor.RunArchivePublisher() // RUN ARCHIVE SENDER

	/**
	*ELASTIC HANDLERS
	**/
	docHandler, err := infrastructure.NewElasticHandler()
	if err != nil {
		logger.Fatal(err.Error())
		return
	}
	docHandlers := make(map[string]interfaces.NosqlHandler)
	docHandlers["DocCdrARepo"] = docHandler
	docHandlers["DocCdrBRepo"] = docHandler
	docHandlers["DocAccountRepo"] = docHandler
	CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
	CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
	CdrInteractor.ElasticAccountsRepository = interfaces.NewDocAccountRepo(docHandlers)
	/********************/

	go CdrInteractor.RunElastic()  // RUN ELASTIC CDR PUBLISHER
	go CdrInteractor.RunAccounts() // RUN ELASTIC ACCOUNT STATUS PUBLISHER
}

func archiveServer() {
	CdrInteractor := new(usecases.CdrInteractor)
	amqpPublisherHandler := infrastructure.NewRabbitPublisherHandler()

	CdrInteractor.AmqPublisherRepository = interfaces.NewPublisherRepo(amqpPublisherHandler)

	docHandler, err := infrastructure.NewElasticHandler()
	if err != nil {
		logger.Fatal(err.Error())
		return
	}
	docHandlers := make(map[string]interfaces.NosqlHandler)
	docHandlers["DocCdrARepo"] = docHandler
	docHandlers["DocCdrBRepo"] = docHandler
	CdrInteractor.ElasticCdrARepository = interfaces.NewDocCdrARepo(docHandlers)
	CdrInteractor.ElasticCdrBRepository = interfaces.NewDocCdrBRepo(docHandlers)
	go CdrInteractor.RunArchiveServer()
}
