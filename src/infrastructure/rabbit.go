package infrastructure

import (
	"fmt"
	"github.com/streadway/amqp"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
	"strings"
	"time"
	"unicode/utf8"
)

type RabbitHandler struct {
	Channel *amqp.Channel
}

type PublisherHandler RabbitHandler
type ReceiverHandler RabbitHandler

func NewRabbitPublisherHandler() *PublisherHandler {
	rabbitHandler := new(PublisherHandler)
	return rabbitHandler
}

func NewRabbitReceiverHandler() *ReceiverHandler {
	rabbitHandler := new(ReceiverHandler)
	return rabbitHandler
}

func dial(connectionString string) (*amqp.Connection, error) {
	logger.Debug("rabbit dialing %q", connectionString)
	connection, err := amqp.Dial(connectionString)
	if err != nil {
		return nil, fmt.Errorf("Dial: %s", err)
	}
	return connection, nil
}

func createChannel(c *amqp.Connection, exchangeName, exchangeType string) (*amqp.Channel, error) {
	logger.Debug("got Connection, getting Channel")
	channel, err := c.Channel()
	if err != nil {
		return nil, fmt.Errorf("Channel: %s", err)
	}
	logger.Debug("got Channel")
	return channel, nil
}

func (handler *PublisherHandler) InitRabbitConn(connectionString, exchangeName, exchangeType string) { //done chan error
	for c := time.Tick(5 * time.Second); ; <-c {
		if conn, err := dial(connectionString); err != nil {
			logger.Error(err.Error())
			logger.Debug("Publisher: trying to reconnect in 5 seconds...")
		} else {
			handler.Channel, err = createChannel(conn, exchangeName, exchangeType)
			if err != nil {
				logger.Error(err.Error())
				continue
			}
			return
		}
	}
}

func (handler *ReceiverHandler) InitRabbitConn(connectionString, exchangeName, exchangeType string) { //done chan error
	for c := time.Tick(5 * time.Second); ; <-c {
		if conn, err := dial(connectionString); err != nil {
			logger.Error(err.Error())
			logger.Debug("Receiver: trying to reconnect in 5 seconds...")
		} else {
			handler.Channel, err = createChannel(conn, exchangeName, exchangeType)
			if err != nil {
				logger.Error(err.Error())
				continue
			}
			return
		}
	}
}

func (handler *ReceiverHandler) PublishMessage(calls []*entity.SqlCdr, routingKey, exchangeName string) error {
	if handler.Channel == nil {
		return fmt.Errorf("Receive AMQ channel not connected")
	}
	//amqp.Error
	var err error
	handler.Channel.Tx()
	for _, item := range calls {
		err = handler.Channel.Publish(
			exchangeName, // exchange
			routingKey,   // routing key
			false,        // mandatory
			false,        // immediate
			amqp.Publishing{
				DeliveryMode: amqp.Persistent,
				ContentType:  "text/plain",
				Body:         item.Event,
			})
		if err != nil {
			break
		}
	}
	if err != nil {
		handler.Channel.TxRollback()
		if amqpError, ok := err.(*amqp.Error); ok {
			return entity.AmqError{
				Code:   amqpError.Code,
				Reason: amqpError.Reason,
			}
		} else {
			return err
		}
	} else {
		handler.Channel.TxCommit()
	}
	return nil
}

func (handler *PublisherHandler) DeclareExchange(exchType, exchName string) error {
	return putExchange(handler.Channel, exchType, exchName)
}

func (handler *ReceiverHandler) DeclareExchange(exchType, exchName string) error {
	return putExchange(handler.Channel, exchType, exchName)
}

func putExchange(channel *amqp.Channel, exchType, exchName string) error {
	logger.Debug("Declaring %q Exchange (%q)", exchType, exchName)
	if err := channel.ExchangeDeclare(
		exchName, // name
		exchType, // type
		true,     // durable
		false,    // auto-deleted
		false,    // internal
		false,    // noWait
		nil,      // arguments
	); err != nil {
		return fmt.Errorf("Channel: %s", err)
	}
	return nil
}

func fixUtf(r rune) rune {
	if r > utf8.MaxRune {
		logger.Error(fmt.Sprintf("fixUtf: skipped non UTF-8 rune %c", r))
		return -1
	}
	return r
}

func (handler *PublisherHandler) GetAmqpMsg(exchName, exchType, routingKey string) (<-chan entity.Delivery, error) {
	q, err := handler.Channel.QueueDeclare(
		routingKey, // name
		true,       // durable
		false,      // delete when usused
		false,      // exclusive
		false,      // no-wait
		nil,        // arguments
	)
	if err != nil {
		return nil, fmt.Errorf("Declare queue error: %s", err)
	}

	err = handler.Channel.QueueBind(
		q.Name,     // queue name
		routingKey, // routing key
		exchName,   // exchange
		false,
		nil)
	if err != nil {
		return nil, fmt.Errorf("Queue bind error: %s", err)
	}

	msgs, err := handler.Channel.Consume(
		q.Name, // queue
		"",     // consumer
		false,  // auto-ack TRUE
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		return nil, fmt.Errorf("Consume error: %s", err)
	}

	entries := make(chan entity.Delivery, cap(msgs))
	go func() {

		for {
			select {
			case msg, ok := <-msgs:
				if !ok {
					close(entries)
					return
				}

				msg.Body = []byte(strings.Map(fixUtf, string(msg.Body)))

				wrupup := AmqpDelivery(msg)
				entries <- &wrupup
			}
		}
	}()
	return (<-chan entity.Delivery)(entries), nil

}

type AmqpDelivery amqp.Delivery

func (d *AmqpDelivery) Ack(multiple bool) error {
	return amqp.Delivery(*d).Ack(multiple)
}

func (d *AmqpDelivery) Nack(multiple, requeue bool) error {
	return amqp.Delivery(*d).Nack(multiple, requeue)
}

func (d *AmqpDelivery) GetBody() []byte {
	return d.Body
}
