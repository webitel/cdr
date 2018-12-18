package conf

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
)

type Configuration struct {
	ArchiveServer    bool   `json:"isArchive" envconfig:"cdr:isArchive"`
	MaxGoroutines    uint32 `json:"maxGoroutines" envconfig:"cdr:maxGoroutines"`
	InsertGoroutines uint32 `json:"insertGoroutines" envconfig:"cdr:insertGoroutines"`
	Postgres         `json:"pg"`
	Rabbit           `json:"broker"`
	Elastic          `json:"elastic"`
	Application      `json:"application"`
}

type Application struct {
	LogLevel string `json:"loglevel"`
}

type Elastic struct {
	Enable            bool            `json:"enable" envconfig:"elastic:enabled"`
	DeleteTemplate    bool            `json:"deleteTemplate"`
	BulkCount         uint32          `json:"bulkCount" envconfig:"elastic:bulkCount"`
	RequestTimeout    uint32          `json:"intervalMillisec" envconfig:"elastic:intervalMillisec"`
	Url               string          `json:"host" envconfig:"elastic:host"`
	IndexNameCdr      string          `json:"indexNameCdr"`
	IndexNameAccounts string          `json:"indexNameAccounts"`
	HttpAuth          string          `json:"httpAuth" envconfig:"elastic:httpAuth"`
	CdrTemplate       ElasticTemplate `json:"cdr_template" ignored:"true"`
	AccountsTemplate  ElasticTemplate `json:"accounts_template" ignored:"true"`
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
	Order    string `json:"orderBy"`
}

type Rabbit struct {
	Publisher Broker `json:"publisher" envconfig:"publisher"`
	Receiver  Broker `json:"receiver" envconfig:"receiver"`
	Account   Broker `json:"account" envconfig:"receiver"`
}

type Broker struct {
	Enable           bool   `json:"enable" envconfig:"broker:enable"`
	ConnectionString string `json:"connectionString" envconfig:"broker:connectionString"`
	ExchangeName     string `json:"exchangeName" envconfig:"broker:exchangeName"`
	ExchangeType     string `json:"exchangeType" envconfig:"broker:exchangeType"`
	RoutingKeyA      string `json:"routingKeyLegA,omitempty" envconfig:"broker:routingKeyLegA"`
	RoutingKeyB      string `json:"routingKeyLegB,omitempty" envconfig:"broker:routingKeyLegB"`
	BulkCount        uint32 `json:"bulkCount" envconfig:"broker:bulkCount"`
	IntervalMillisec uint32 `json:"intervalMillisec" envconfig:"broker:intervalMillisec"`
	RoutingKey       string `json:"routingKey,omitempty" envconfig:"broker:enable"`
}

var config *Configuration

func InitConfig() error {
	config = new(Configuration)
	if err := config.readFromFile(); err != nil {
		return fmt.Errorf("Config. Read from file: %s", err)
	}
	if err := config.readTemplate(); err != nil {
		return fmt.Errorf("Config. Read from elastic template: %s", err)
	}
	if err := config.readFromEnviroment(); err != nil {
		return fmt.Errorf("Config. Read from enviroment: %s", err)
	}
	return nil
}

func GetLogLevel() string {
	return config.Application.LogLevel
}

func GetPublisher() Broker {
	return config.Rabbit.Publisher
}

func GetReceiver() Broker {
	return config.Rabbit.Receiver
}

func GetAccountPublisher() Broker {
	return config.Rabbit.Account
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

func MaxGoroutines() uint32 {
	return config.MaxGoroutines
}

func InsertGoroutines() uint32 {
	return config.InsertGoroutines
}

func GetListenerConfig() (uint32, uint32) {
	return config.Rabbit.Publisher.BulkCount, config.Rabbit.Publisher.IntervalMillisec
}

func GetReceiverConfig() (uint32, uint32) {
	return config.Rabbit.Receiver.BulkCount, config.Rabbit.Receiver.IntervalMillisec
}

func GetAccountConfig() (uint32, uint32) {
	return config.Rabbit.Account.BulkCount, config.Rabbit.Account.IntervalMillisec
}

func (conf *Configuration) readFromFile() error {
	filePath := flag.String("c", "./conf/config.json", "Config file path")
	flag.Parse()
	if _, err := os.Stat(*filePath); os.IsNotExist(err) {
		return fmt.Errorf("No found config file: %s", *filePath)
	}
	file, err := ioutil.ReadFile(*filePath)
	if err != nil {
		return err
	}
	err = json.Unmarshal(file, conf)
	return err
}

func (conf *Configuration) readTemplate() error {
	file, err := ioutil.ReadFile("./conf/elastic2.json")
	if err != nil {
		return err
	}
	err = json.Unmarshal(file, &conf.Elastic)
	return err
}

func (conf *Configuration) readFromEnviroment() error {
	// var c *gonfig.Gonfig
	// c = gonfig.NewConfig(nil)
	// a := c.Use("env", gonfig.NewEnvConfig(""))
	// for k, v := range a.All() {
	// 	fmt.Sprintf("%s - %s", k, v)
	// }
	// return nil
	//var a map[string]interface{}
	// err := envconfig.Process("", conf)
	// return err
	if value := os.Getenv("application:logLevel"); value != "" {
		conf.Application.LogLevel = value
	}
	if value := os.Getenv("pg:user"); value != "" {
		conf.Postgres.User = value
	}
	if value := os.Getenv("pg:database"); value != "" {
		conf.Postgres.Database = value
	}
	if value := os.Getenv("pg:password"); value != "" {
		conf.Postgres.Password = value
	}
	if value := os.Getenv("pg:tableA"); value != "" {
		conf.Postgres.TableA = value
	}
	if value := os.Getenv("pg:tableB"); value != "" {
		conf.Postgres.TableB = value
	}
	if value := os.Getenv("pg:host"); value != "" {
		conf.Postgres.Host = value
	}
	if value := os.Getenv("pg:port"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Postgres.Port = int32(i)
	}
	if value := os.Getenv("pg:orderBy"); value != "" {
		conf.Postgres.Order = value
	}
	if value := os.Getenv("elastic:enable"); value != "" {
		if value == "1" || value == "true" {
			conf.Elastic.Enable = true
		} else if value == "0" || value == "false" {
			conf.Elastic.Enable = false
		}
	}
	if value := os.Getenv("elastic:deleteTemplate"); value != "" {
		if value == "1" || value == "true" {
			conf.Elastic.DeleteTemplate = true
		} else if value == "0" || value == "false" {
			conf.Elastic.DeleteTemplate = false
		}
	}
	if value := os.Getenv("elastic:bulkCount"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Elastic.BulkCount = uint32(i)
	}
	if value := os.Getenv("elastic:intervalMillisec"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Elastic.RequestTimeout = uint32(i)
	}
	if value := os.Getenv("elastic:host"); value != "" {
		conf.Elastic.Url = value
	}
	if value := os.Getenv("elastic:indexNameCdr"); value != "" {
		conf.Elastic.IndexNameCdr = value
	}
	if value := os.Getenv("elastic:indexNameAccounts"); value != "" {
		conf.Elastic.IndexNameCdr = value
	}
	if value := os.Getenv("elastic:httpAuth"); value != "" {
		conf.Elastic.HttpAuth = value
	}
	if value := os.Getenv("broker:publisher:connectionString"); value != "" {
		conf.Rabbit.Publisher.ConnectionString = value
	}
	if value := os.Getenv("broker:publisher:enable"); value != "" {
		if value == "1" || value == "true" {
			conf.Rabbit.Publisher.Enable = true
		} else if value == "0" || value == "false" {
			conf.Rabbit.Publisher.Enable = false
		}
	}
	if value := os.Getenv("broker:publisher:exchangeName"); value != "" {
		conf.Rabbit.Publisher.ExchangeName = value
	}
	if value := os.Getenv("broker:publisher:exchangeType"); value != "" {
		conf.Rabbit.Publisher.ExchangeType = value
	}
	if value := os.Getenv("broker:publisher:routingKeyLegA"); value != "" {
		conf.Rabbit.Publisher.RoutingKeyA = value
	}
	if value := os.Getenv("broker:publisher:routingKeyLegB"); value != "" {
		conf.Rabbit.Publisher.RoutingKeyB = value
	}
	if value := os.Getenv("broker:publisher:bulkCount"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Publisher.BulkCount = uint32(i)
	}
	if value := os.Getenv("broker:publisher:intervalMillisec"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Publisher.IntervalMillisec = uint32(i)
	}
	if value := os.Getenv("broker:receiver:enable"); value != "" {
		if value == "1" || value == "true" {
			conf.Rabbit.Receiver.Enable = true
		} else if value == "0" || value == "false" {
			conf.Rabbit.Receiver.Enable = false
		}
	}
	if value := os.Getenv("broker:receiver:connectionString"); value != "" {
		conf.Rabbit.Receiver.ConnectionString = value
	}
	if value := os.Getenv("broker:receiver:exchangeName"); value != "" {
		conf.Rabbit.Receiver.ExchangeName = value
	}
	if value := os.Getenv("broker:receiver:exchangeType"); value != "" {
		conf.Rabbit.Receiver.ExchangeType = value
	}
	if value := os.Getenv("broker:receiver:routingKeyLegA"); value != "" {
		conf.Rabbit.Receiver.RoutingKeyA = value
	}
	if value := os.Getenv("broker:receiver:routingKeyLegB"); value != "" {
		conf.Rabbit.Receiver.RoutingKeyB = value
	}
	if value := os.Getenv("broker:receiver:bulkCount"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Receiver.BulkCount = uint32(i)
	}
	if value := os.Getenv("broker:receiver:intervalMillisec"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Receiver.IntervalMillisec = uint32(i)
	}
	if value := os.Getenv("broker:account:connectionString"); value != "" {
		conf.Rabbit.Account.ConnectionString = value
	}
	if value := os.Getenv("broker:account:exchangeName"); value != "" {
		conf.Rabbit.Account.ExchangeName = value
	}
	if value := os.Getenv("broker:account:exchangeType"); value != "" {
		conf.Rabbit.Account.ExchangeType = value
	}
	if value := os.Getenv("broker:account:routingKey"); value != "" {
		conf.Rabbit.Account.RoutingKey = value
	}
	if value := os.Getenv("broker:account:bulkCount"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Account.BulkCount = uint32(i)
	}
	if value := os.Getenv("broker:account:intervalMillisec"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.Rabbit.Account.IntervalMillisec = uint32(i)
	}
	if value := os.Getenv("broker:account:enable"); value != "" {
		if value == "1" || value == "true" {
			conf.Rabbit.Account.Enable = true
		} else if value == "0" || value == "false" {
			conf.Rabbit.Account.Enable = false
		}
	}
	if value := os.Getenv("isArchive"); value != "" {
		if value == "1" || value == "true" {
			conf.ArchiveServer = true
		} else if value == "0" || value == "false" {
			conf.ArchiveServer = false
		}
	}
	if value := os.Getenv("maxGoroutines"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.MaxGoroutines = uint32(i)
	}
	if value := os.Getenv("insertGoroutines"); value != "" {
		i, _ := strconv.Atoi(value)
		conf.InsertGoroutines = uint32(i)
	}
	if value := os.Getenv("application:loglevel"); value != "" {
		conf.Application.LogLevel = value
	}
	return nil
}
