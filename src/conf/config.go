package conf

import (
	"encoding/json"
	"fmt"
	"io/ioutil"

	"github.com/kelseyhightower/envconfig"
)

type Configuration struct {
	ArchiveServer bool `json:"isArchive" envconfig:"cdr:isArchive"`
	Postgres      `json:"pg"`
	Rabbit        `json:"broker"`
	Elastic       `json:"elastic"`
}

type Elastic struct {
	Enabled         bool   `json:"enabled" envconfig:"elastic:enabled"`
	BulkCount       uint32 `json:"bulkCount" envconfig:"elastic:bulkCount"`
	RequestTimeout  uint32 `json:"intervalMillisec" envconfig:"elastic:intervalMillisec"`
	Url             string `json:"host" envconfig:"elastic:host"`
	IndexName       string `json:"indexName" envconfig:"elastic:indexName"`
	TypeName        string `json:"typeName" envconfig:"elastic:typeName"`
	ElasticTemplate `json:"template" ignored:"true"`
}

type ElasticTemplate struct {
	Name string                 `json:"name"`
	Body map[string]interface{} `json:"body"`
}

type Postgres struct {
	User     string `json:"user" envconfig:"pg:user"`
	Database string `json:"database" envconfig:"pg:database"`
	Password string `json:"password" envconfig:"pg:password"`
	TableA   string `json:"cdrTableA" envconfig:"pg:tableA"`
	TableB   string `json:"cdrTableB" envconfig:"pg:tableB"`
	Host     string `json:"host" envconfig:"pg:host"`
	Port     int32  `json:"port" envconfig:"pg:port"`
}

type Rabbit struct {
	Publisher Broker `json:"publisher" envconfig:"publisher"`
	Receiver  Broker `json:"receiver" envconfig:"receiver"`
}

type Broker struct {
	Enable           bool   `json:"enable" envconfig:"broker:enable"`
	ConnectionString string `json:"connectionString" envconfig:"broker:connectionString"`
	ExchangeName     string `json:"exchangeName" envconfig:"broker:exchangeName"`
	ExchangeType     string `json:"exchangeType" envconfig:"broker:exchangeType"`
	RoutingKeyA      string `json:"routingKeyLegA" envconfig:"broker:routingKeyLegA"`
	RoutingKeyB      string `json:"routingKeyLegB" envconfig:"broker:routingKeyLegB"`
	BulkCount        uint32 `json:"bulkCount" envconfig:"broker:bulkCount"`
	IntervalMillisec uint32 `json:"intervalMillisec" envconfig:"broker:intervalMillisec"`
}

var config *Configuration

func InitConfig() error {
	config = new(Configuration)
	if err := config.readFromFile(); err != nil {
		return fmt.Errorf("Config. Read from file: %s", err)
	}
	if err := config.readFromEnviroment(); err != nil {
		return fmt.Errorf("Config. Read from enviroment: %s", err)
	}
	return nil
}

func GetPublisher() Broker {
	return config.Rabbit.Publisher
}

func GetReceiver() Broker {
	return config.Rabbit.Receiver
}

func GetPostgres() Postgres {
	return config.Postgres
}

func GetElastic() Elastic {
	return config.Elastic
}

func IsArchive() bool {
	return config.ArchiveServer
}

func GetListenerConfig() (uint32, uint32) {
	return config.Rabbit.Publisher.BulkCount, config.Rabbit.Publisher.IntervalMillisec
}

func GetReceiverConfig() (uint32, uint32) {
	return config.Rabbit.Receiver.BulkCount, config.Rabbit.Receiver.IntervalMillisec
}

func (conf *Configuration) readFromFile() error {
	file, err := ioutil.ReadFile("./conf/config.json")
	if err != nil {
		return err
	}
	err = json.Unmarshal(file, conf)
	return err
}

func (conf *Configuration) readFromEnviroment() error {
	err := envconfig.Process("", conf)
	if err != nil {
		return err
	}
	return err
}
