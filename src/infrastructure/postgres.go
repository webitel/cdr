package infrastructure

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/interfaces"
	"github.com/webitel/cdr/src/logger"
)

type PostgresHandler struct {
	Conn *sql.DB
}

var pgConfig conf.Postgres

func NewPostgresHandler() (*PostgresHandler, error) {
	pgConfig = conf.GetPostgres()
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		pgConfig.Host, pgConfig.Port, pgConfig.User, pgConfig.Password, pgConfig.Database)
	var pgHandler *PostgresHandler
	for c := time.Tick(5 * time.Second); ; <-c {
		dbConnection, err := sql.Open("postgres", psqlInfo)
		if err != nil {
			logger.Error("PostgreSQL Connection: " + err.Error())
			continue
		}
		if err = dbConnection.Ping(); err != nil {
			logger.Error("PostgreSQL Ping: " + err.Error())
			continue
		}
		pgHandler = new(PostgresHandler)
		pgHandler.Conn = dbConnection
		logger.Debug("PostgreSQL: connect to %s:%v", pgConfig.Host, pgConfig.Port)
		break
	}
	return pgHandler, nil
}

func (handler *PostgresHandler) ExecuteQuery(query string, params ...interface{}) error {
	_, err := handler.Conn.Exec(query, params...)
	if err != nil {
		return fmt.Errorf("PostgreSQL. Execute script error.\nError message: %s\n", err)
	}
	return err
}

func (handler *PostgresHandler) GetRows(query string, params ...interface{}) (interfaces.Row, error) {
	rows, err := handler.Conn.Query(query, params...)
	if err != nil {
		return nil, fmt.Errorf("PostgreSQL. Get rows error.\nError message: %s\n", err)
	}
	row := new(PostgresRow)
	row.Rows = rows
	return row, nil
}

func (handler *PostgresHandler) CreateTable(query string) error {
	_, err := handler.Conn.Exec(query)
	if err != nil {
		return fmt.Errorf("PostgreSQL. Create table error: %s", err)
	}
	return err
}

type PostgresRow struct {
	Rows *sql.Rows
}

func (r PostgresRow) Scan(dest ...interface{}) error {
	return r.Rows.Scan(dest...)
}

func (r PostgresRow) Next() bool {
	return r.Rows.Next()
}

func (r PostgresRow) Close() error {
	return r.Rows.Close()
}
