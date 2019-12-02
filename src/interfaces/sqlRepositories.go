package interfaces

import (
	"fmt"
	"strings"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
)

const (
	cdrInsertQueryB        = "INSERT INTO #table#(uuid, parent_uuid, created_at, size, event) VALUES "
	cdrInsertQueryA        = "INSERT INTO #table#(uuid, created_at, size, event) VALUES "
	cdrInsertQueue         = "INSERT INTO #table#_#option#(uuid, created_at, event, state) VALUES "
	cdrValuesB             = "(%v, %v, %v, %v, %v),"
	cdrValuesA             = "(%v, %v, %v, %v),"
	cdrValuesQueue         = "(%v, %v, %v),"
	cdrUpdateWithReturning = "UPDATE #table#_#option# SET state = 1 WHERE id IN ( SELECT id FROM #table#_#option# WHERE state = $1 ORDER BY created_at #order# LIMIT $2 FOR UPDATE SKIP LOCKED) RETURNING id, uuid, event"
	//cdrUpdateWithReturningB = "UPDATE #table#_#option# SET state = 1 WHERE id IN ( SELECT id FROM #table# WHERE #state#_state = $1 AND parent_uuid != '' ORDER BY created_at #order# LIMIT $2 FOR UPDATE SKIP LOCKED) RETURNING uuid, event"
	// cdrJoin             = "SELECT a.uuid as parent_uuid, b.event as event, b.uuid as uuid FROM #table_a# as a INNER JOIN #table_b# as b ON a.uuid = b.parent_uuid WHERE a.stored_state=$1 AND b.stored_state=$2 ORDER BY b.created_at ASC LIMIT $3"
	cdrUpdateStateQuery = "UPDATE #table#_#option# SET state=$1 WHERE uuid IN (#values#)"
	cdrDeleteFromQuery  = "DELETE from #table#_#option# where uuid IN (#values#)"
	cdrQueueTable       = `
							CREATE TABLE IF NOT EXISTS #table#_#option#
							(
								id BIGSERIAL NOT NULL CONSTRAINT #table#_#option#_pkey PRIMARY KEY,
								uuid character varying(255) COLLATE pg_catalog."default" NOT NULL,
								event jsonb,
								state smallint,
								created_at bigint								
							)
							WITH (
								OIDS = FALSE
							)
							TABLESPACE pg_default;

							create index if not exists #table#_#option#_created_at_state_index
								on #table#_#option# (created_at, state)
							;
	`
	cdrCreateTableA = `
							CREATE TABLE IF NOT EXISTS #table#
							(
								id BIGSERIAL NOT NULL CONSTRAINT #table#_pkey PRIMARY KEY,
								uuid character varying(255) COLLATE pg_catalog."default" NOT NULL,								
								created_at bigint,								
								size integer,
								event jsonb														
							)
							WITH (
								OIDS = FALSE
							)
							TABLESPACE pg_default;	
						`  //$1 - public.cdr $2 - webitel
	cdrCreateTableB = `
						CREATE TABLE IF NOT EXISTS #table#
						(
							id BIGSERIAL NOT NULL CONSTRAINT #table#_pkey PRIMARY KEY,
							uuid character varying(255) COLLATE pg_catalog."default" NOT NULL,
							parent_uuid character varying(255) COLLATE pg_catalog."default",
							created_at bigint,
							size integer,
							event jsonb													
						)
						WITH (
							OIDS = FALSE
						)
						TABLESPACE pg_default;
					`  //$1 - public.cdr $2 - webitel

	sqlCreateTableForBadEvents = `
create table  IF NOT EXISTS cdr_bad_event
(
	id serial not null
		constraint cdr_bad_event_pkey
			primary key,
	created_at integer default (date_part('epoch'::text, timezone('utc'::text, now())))::integer not null,
	uuid varchar(50),
	leg varchar(1),
	event bytea not null
)
;

create unique index  IF NOT EXISTS cdr_bad_event_id_uindex
	on cdr_bad_event (id)
;`

	sqlCreateTrigger = `CREATE OR REPLACE FUNCTION #table#_instead_insert()
  RETURNS trigger AS
$func$
BEGIN
   RETURN new;
   EXCEPTION WHEN others THEN  -- or be more specific
    raise notice 'error save cdr %', new.uuid;
    RETURN NULL;   -- cancel row
END
$func$  LANGUAGE plpgsql;

DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM information_schema.triggers
                      WHERE event_object_table = '#table#'
                        AND trigger_name = '#table#_instead_insert_tg'
            )
        THEN
            CREATE TRIGGER #table#_instead_insert_tg
                BEFORE INSERT
                ON #table#
                FOR EACH ROW
            EXECUTE PROCEDURE #table#_instead_insert();

        END IF;

    END;
$$;
`
)

var config conf.Postgres

func InitConfig() {
	config = conf.GetPostgres()
}

type DbHandler interface {
	ExecuteQuery(query string, params ...interface{}) error
	GetRows(query string, params ...interface{}) (Row, error)
	CreateTable(query string) error
}

type Row interface {
	Scan(dest ...interface{}) error
	Next() bool
	Close() error
}

type DbRepo struct {
	dbHandlers map[string]DbHandler
	dbHandler  DbHandler
}

type DbCdrARepo DbRepo
type DbCdrBRepo DbRepo
type DbHelper DbRepo

func NewDbCdrARepo(dbHandlers map[string]DbHandler) *DbCdrARepo {
	DbCdrARepo := new(DbCdrARepo)
	DbCdrARepo.dbHandlers = dbHandlers
	DbCdrARepo.dbHandler = dbHandlers["DbCdrARepo"]
	return DbCdrARepo
}

func NewDbCdrBRepo(dbHandlers map[string]DbHandler) *DbCdrBRepo {
	DbCdrBRepo := new(DbCdrBRepo)
	DbCdrBRepo.dbHandlers = dbHandlers
	DbCdrBRepo.dbHandler = dbHandlers["DbCdrBRepo"]
	return DbCdrBRepo
}

func NewDbHelperRepo(dbHandlers map[string]DbHandler) *DbHelper {
	dbHelper := new(DbHelper)
	dbHelper.dbHandlers = dbHandlers
	dbHelper.dbHandler = dbHandlers["NewDbHelperRepo"]
	return dbHelper
}

func (repo *DbHelper) CreateTableIfNotExist() error {
	return repo.dbHandler.CreateTable(sqlCreateTableForBadEvents)
}

func (repo *DbHelper) InsertBadEvent(uuid, leg string, event []byte) error {
	return repo.dbHandler.ExecuteQuery(`insert into cdr_bad_event(uuid, leg, event) 
		values($1, $2, $3)`, uuid, leg, event)
}

func (repo *DbCdrARepo) DeleteFromQueue(calls []*entity.SqlCdr, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrDeleteFromQuery, "#table#", config.TableA, -1), "#option#", option, -1)
	vals := []interface{}{}
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v, ", i+1)
		vals = append(vals, row.Uuid)
	}
	strValues = strValues[0 : len(strValues)-2]
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) InsertPack(calls []entity.SqlCdr) error {
	sqlStr := strings.Replace(cdrInsertQueryA, "#table#", config.TableA, -1)
	vals := []interface{}{}
	var strValues string
	valCounter := 1
	for _, row := range calls {
		strValues = fmt.Sprintf(cdrValuesA,
			fmt.Sprintf("$%v", valCounter),
			fmt.Sprintf("$%v", valCounter+1),
			fmt.Sprintf("$%v", valCounter+2),
			fmt.Sprintf("$%v", valCounter+3))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Created_at,
			row.Size,
			row.Event)
		valCounter = valCounter + 4
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) InsertIntoQueue(calls []entity.SqlCdr, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrInsertQueue, "#table#", config.TableA, -1), "#option#", option, -1)
	vals := []interface{}{}
	var strValues string
	valCounter := 1
	for _, row := range calls {
		strValues = fmt.Sprintf(cdrValuesA,
			fmt.Sprintf("$%v", valCounter),
			fmt.Sprintf("$%v", valCounter+1),
			fmt.Sprintf("$%v", valCounter+2),
			fmt.Sprintf("$%v", valCounter+3))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Created_at,
			row.Event,
			0)
		valCounter = valCounter + 4
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) SelectPackByState(count uint32, state uint8, option string) ([]*entity.SqlCdr, error) {
	rows, err := repo.dbHandler.GetRows(strings.Replace(strings.Replace(strings.Replace(cdrUpdateWithReturning, "#table#", config.TableA, -1), "#option#", option, -1), "#order#", config.Order, -1), state, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cdr := make([]*entity.SqlCdr, 0, count)

	for rows.Next() {
		call := new(entity.SqlCdr)
		err = rows.Scan(&call.Id, &call.Uuid, &call.Event)
		if err != nil {
			return nil, err
		}
		cdr = append(cdr, call)
	}
	return cdr, nil
}

func (repo *DbCdrARepo) UpdateState(calls []*entity.SqlCdr, state uint8, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrUpdateStateQuery, "#table#", config.TableA, -1), "#option#", option, -1)
	vals := []interface{}{}
	vals = append(vals, state) //uint64(time.Now().UnixNano()/1000000)
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v, ", i+2)
		vals = append(vals, row.Uuid)
	}
	strValues = strValues[0 : len(strValues)-2]
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) CreateTableIfNotExist() error {
	sqlStr := strings.Replace(strings.Replace(cdrCreateTableA, "#table#", config.TableA, -1), "#user#", config.User, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}

func (repo *DbCdrARepo) CreateTrigger() error {
	sql := strings.Replace(sqlCreateTrigger, "#table#", config.TableA, -1)
	return repo.dbHandler.ExecuteQuery(sql)
}

func (repo *DbCdrBRepo) CreateTrigger() error {
	sql := strings.Replace(sqlCreateTrigger, "#table#", config.TableB, -1)
	return repo.dbHandler.ExecuteQuery(sql)
}

func (repo *DbCdrARepo) CreateQueueTableIfNotExist(option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrQueueTable, "#table#", config.TableA, -1), "#option#", option, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}

func (repo *DbCdrBRepo) InsertPack(calls []entity.SqlCdr) error {
	sqlStr := strings.Replace(cdrInsertQueryB, "#table#", config.TableB, -1)
	vals := []interface{}{}
	var strValues string
	valCounter := 1
	for _, row := range calls {
		strValues = fmt.Sprintf(cdrValuesB,
			fmt.Sprintf("$%v", valCounter),
			fmt.Sprintf("$%v", valCounter+1),
			fmt.Sprintf("$%v", valCounter+2),
			fmt.Sprintf("$%v", valCounter+3),
			fmt.Sprintf("$%v", valCounter+4))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Parent_uuid,
			row.Created_at,
			row.Size,
			row.Event)
		valCounter = valCounter + 5
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrBRepo) InsertIntoQueue(calls []entity.SqlCdr, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrInsertQueue, "#table#", config.TableB, -1), "#option#", option, -1)
	vals := []interface{}{}
	var strValues string
	valCounter := 1
	for _, row := range calls {
		strValues = fmt.Sprintf(cdrValuesA,
			fmt.Sprintf("$%v", valCounter),
			fmt.Sprintf("$%v", valCounter+1),
			fmt.Sprintf("$%v", valCounter+2),
			fmt.Sprintf("$%v", valCounter+3))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Created_at,
			row.Event,
			0)
		valCounter = valCounter + 4
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrBRepo) SelectPackByState(count uint32, state uint8, option string) ([]*entity.SqlCdr, error) {
	rows, err := repo.dbHandler.GetRows(strings.Replace(strings.Replace(strings.Replace(cdrUpdateWithReturning, "#table#", config.TableB, -1), "#option#", option, -1), "#order#", config.Order, -1), state, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cdr := make([]*entity.SqlCdr, 0, count)

	for rows.Next() {
		call := new(entity.SqlCdr)
		err = rows.Scan(&call.Id, &call.Uuid, &call.Event)
		if err != nil {
			return nil, err
		}
		cdr = append(cdr, call)
	}
	return cdr, nil
}

func (repo *DbCdrBRepo) DeleteFromQueue(calls []*entity.SqlCdr, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrDeleteFromQuery, "#table#", config.TableB, -1), "#option#", option, -1)
	vals := []interface{}{}
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v, ", i+1)
		vals = append(vals, row.Uuid)
	}
	strValues = strValues[0 : len(strValues)-2]
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrBRepo) UpdateState(calls []*entity.SqlCdr, state uint8, option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrUpdateStateQuery, "#table#", config.TableB, -1), "#option#", option, -1)
	vals := []interface{}{}
	vals = append(vals, state) //uint64(time.Now().UnixNano()/1000000)
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v, ", i+2)
		vals = append(vals, row.Uuid)
	}
	strValues = strValues[0 : len(strValues)-2]
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrBRepo) CreateTableIfNotExist() error {
	sqlStr := strings.Replace(strings.Replace(cdrCreateTableB, "#table#", config.TableB, -1), "#user#", config.User, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}

func (repo *DbCdrBRepo) CreateQueueTableIfNotExist(option string) error {
	sqlStr := strings.Replace(strings.Replace(cdrQueueTable, "#table#", config.TableB, -1), "#option#", option, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}
