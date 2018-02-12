package interfaces

import "webitel.com/cdr_service/entity"

// type AmqpHandler interface {
// 	InitRabbitConn(connectionString, exchangeName, exchangeType string)
// 	GetAmqpMsg(exchName, exchType, routingKey string) (<-chan entity.Delivery, error)
// 	PublishMessage(calls []entity.SqlCdr, routingKey, exchangeName string) error
// }

// type AmqpRepo struct {
// 	amqpHandler AmqpHandler
// }

// type PublisherRepo AmqpRepo
// type ReceiverRepo AmqpRepo

type AmqpPublisherHandler interface {
	InitRabbitConn(connectionString, exchangeName, exchangeType string)
	GetAmqpMsg(exchName, exchType, routingKey string) (<-chan entity.Delivery, error)
}
type AmqpReceiverHandler interface {
	InitRabbitConn(connectionString, exchangeName, exchangeType string)
	PublishMessage(calls []entity.SqlCdr, routingKey, exchangeName string) error
}

type PublisherRepo struct {
	amqpHandler AmqpPublisherHandler
}

type ReceiverRepo struct {
	amqpHandler AmqpReceiverHandler
}

// type PublisherRepo AmqpRepo
// type ReceiverRepo AmqpRepo

func NewPublisherRepo(amqpHandler AmqpPublisherHandler) *PublisherRepo {
	AmqpRepo := new(PublisherRepo)
	AmqpRepo.amqpHandler = amqpHandler
	return AmqpRepo
}

func NewReceiverRepo(amqpHandler AmqpReceiverHandler) *ReceiverRepo {
	AmqpRepo := new(ReceiverRepo)
	AmqpRepo.amqpHandler = amqpHandler
	return AmqpRepo
}

func (repo *PublisherRepo) CreateAmqConnection(connectionString, exchangeName, exchangeType string) {
	repo.amqpHandler.InitRabbitConn(connectionString, exchangeName, exchangeType)
}

func (repo *PublisherRepo) GetMessages(exchName, exchType, routingKey string) (<-chan entity.Delivery, error) {
	msgs, err := repo.amqpHandler.GetAmqpMsg(exchName, exchType, routingKey)
	if err != nil {
		return nil, err
	}
	return msgs, nil //fmt.Errorf("Channel was closed")
}

func (repo *ReceiverRepo) CreateAmqConnection(connectionString, exchangeName, exchangeType string) {
	repo.amqpHandler.InitRabbitConn(connectionString, exchangeName, exchangeType)
}

func (repo *ReceiverRepo) SendMessage(calls []entity.SqlCdr, routingKey, exchangeName string) error {
	return repo.amqpHandler.PublishMessage(calls, routingKey, exchangeName)
}
