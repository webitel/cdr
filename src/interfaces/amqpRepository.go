package interfaces

import "github.com/webitel/cdr/src/entity"

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
	return msgs, nil
}

func (repo *ReceiverRepo) CreateAmqConnection(connectionString, exchangeName, exchangeType string) {
	repo.amqpHandler.InitRabbitConn(connectionString, exchangeName, exchangeType)
}

func (repo *ReceiverRepo) SendMessage(calls []entity.SqlCdr, routingKey, exchangeName string) error {
	return repo.amqpHandler.PublishMessage(calls, routingKey, exchangeName)
}
