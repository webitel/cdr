package interfaces

import (
	"fmt"
	"strings"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
)

const (
	cdrInsertQueryB     = "INSERT INTO #table#(uuid, parent_uuid, created_at, stored_at, archived_at, size, event, stored_state, archived_state) VALUES "
	cdrInsertQueryA     = "INSERT INTO #table#(uuid, created_at, stored_at, archived_at, size, event, stored_state, archived_state) VALUES "
	cdrValuesB          = "(%v, %v, %v, %v, %v, %v, %v, %v, %v),"
	cdrValuesA          = "(%v, %v, %v, %v, %v, %v, %v, %v),"
	cdrSelectByState    = "SELECT uuid, event FROM #table# WHERE #state#_state=$1 ORDER BY created_at ASC LIMIT $2 FOR UPDATE"
	cdrSelectByStateB   = "SELECT uuid, event FROM #table# WHERE #state#_state=$1 AND parent_uuid != '' ORDER BY created_at ASC LIMIT $2 FOR UPDATE"
	cdrJoin             = "SELECT a.uuid as parent_uuid, b.event as event, b.uuid as uuid FROM #table_a# as a INNER JOIN #table_b# as b ON a.uuid = b.parent_uuid WHERE a.stored_state=$1 AND b.stored_state=$2 ORDER BY b.created_at ASC LIMIT $3"
	cdrUpdateStateQuery = "UPDATE #table# SET #state#_state=$1, #state#_at=$2 WHERE uuid IN (#values#)"
	cdrCreateTableA     = `
							CREATE TABLE IF NOT EXISTS #table#
							(
								uuid character varying(255) COLLATE pg_catalog."default" NOT NULL,								
								created_at bigint,
								stored_at bigint,
								archived_at bigint,
								size integer,
								event bytea,
								stored_state smallint,
								archived_state smallint,
								CONSTRAINT #table#_pkey PRIMARY KEY (uuid)
							)
							WITH (
								OIDS = FALSE
							)
							TABLESPACE pg_default;

							ALTER TABLE #table#
								OWNER to #user#;
								
							create index if not exists #table#_created_at_stored_state_index
								on #table# (created_at, stored_state)
							;
						
							create index if not exists #table#_created_at_archived_state_index
								on #table# (created_at, archived_state)
							;
						` //$1 - public.cdr $2 - webitel
	cdrCreateTableB = `
						CREATE TABLE IF NOT EXISTS #table#
						(
							uuid character varying(255) COLLATE pg_catalog."default" NOT NULL,
							parent_uuid character varying(255) COLLATE pg_catalog."default",
							created_at bigint,
							stored_at bigint,
							archived_at bigint,
							size integer,
							event bytea,
							stored_state smallint,
							archived_state smallint,
							CONSTRAINT #table#_pkey PRIMARY KEY (uuid)
						)
						WITH (
							OIDS = FALSE
						)
						TABLESPACE pg_default;

						ALTER TABLE #table#
							OWNER to #user#;
							
						create index if not exists #table#_created_at_stored_state_index
							on #table# (created_at, stored_state)
						;
					
						create index if not exists #table#_created_at_archived_state_index
							on #table# (created_at, archived_state)
						;
					` //$1 - public.cdr $2 - webitel
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
			fmt.Sprintf("$%v", valCounter+3),
			fmt.Sprintf("$%v", valCounter+4),
			fmt.Sprintf("$%v", valCounter+5),
			fmt.Sprintf("$%v", valCounter+6),
			fmt.Sprintf("$%v", valCounter+7))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Created_at,
			row.Stored_at,
			row.Archived_at,
			row.Size,
			row.Event,
			row.Stored_state,
			row.Archived_state)
		valCounter = valCounter + 8
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) SelectPackByState(count uint32, state uint8, stateName string) ([]entity.SqlCdr, error) {
	rows, err := repo.dbHandler.GetRows(strings.Replace(strings.Replace(cdrSelectByState, "#table#", config.TableA, -1), "#state#", stateName, -1), state, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cdr []entity.SqlCdr
	var call entity.SqlCdr
	for rows.Next() {
		err = rows.Scan(&call.Uuid, &call.Event)
		if err != nil {
			return nil, err
		}
		cdr = append(cdr, call)
	}
	return cdr, nil
}

func (repo *DbCdrARepo) JoinLegsPack(count uint32) ([]entity.SqlCdr, error) {
	panic(count)
}

func (repo *DbCdrARepo) UpdateState(calls []entity.SqlCdr, state uint8, timestamp uint64, stateName string) error {
	sqlStr := strings.Replace(strings.Replace(cdrUpdateStateQuery, "#table#", config.TableA, -1), "#state#", stateName, -1)
	vals := []interface{}{}
	vals = append(vals, state, timestamp) //uint64(time.Now().UnixNano()/1000000)
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v, ", i+3)
		vals = append(vals, row.Uuid)
	}
	strValues = strValues[0 : len(strValues)-2]
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
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
			fmt.Sprintf("$%v", valCounter+4),
			fmt.Sprintf("$%v", valCounter+5),
			fmt.Sprintf("$%v", valCounter+6),
			fmt.Sprintf("$%v", valCounter+7),
			fmt.Sprintf("$%v", valCounter+8))
		sqlStr += strValues
		vals = append(vals,
			row.Uuid,
			row.Parent_uuid,
			row.Created_at,
			row.Stored_at,
			row.Archived_at,
			row.Size,
			row.Event,
			row.Stored_state,
			row.Archived_state)
		valCounter = valCounter + 9
	}
	sqlStr = sqlStr[0 : len(sqlStr)-1]
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrARepo) CreateTableIfNotExist() error {
	sqlStr := strings.Replace(strings.Replace(cdrCreateTableA, "#table#", config.TableA, -1), "#user#", config.User, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}

func (repo *DbCdrBRepo) SelectPackByState(count uint32, state uint8, stateName string) ([]entity.SqlCdr, error) {
	rows, err := repo.dbHandler.GetRows(strings.Replace(strings.Replace(cdrSelectByStateB, "#table#", config.TableB, -1), "#state#", stateName, -1), state, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cdr []entity.SqlCdr
	var call entity.SqlCdr
	for rows.Next() {
		err = rows.Scan(&call.Uuid, &call.Event)
		if err != nil {
			return nil, err
		}
		cdr = append(cdr, call)
	}
	return cdr, nil
}

func (repo *DbCdrBRepo) JoinLegsPack(count uint32) ([]entity.SqlCdr, error) {
	rows, err := repo.dbHandler.GetRows(strings.Replace(strings.Replace(cdrJoin, "#table_a#", config.TableA, -1), "#table_b#", config.TableB, -1), 2, 0, count)
	if err != nil {
		return nil, err
	}
	var cdr []entity.SqlCdr
	var call entity.SqlCdr
	for rows.Next() {
		err = rows.Scan(&call.Parent_uuid, &call.Event, &call.Uuid)
		if err != nil {
			return nil, err
		}
		cdr = append(cdr, call)
	}
	return cdr, nil
}

func (repo *DbCdrBRepo) UpdateState(calls []entity.SqlCdr, state uint8, timestamp uint64, stateName string) error {
	sqlStr := strings.Replace(strings.Replace(cdrUpdateStateQuery, "#table#", config.TableB, -1), "#state#", stateName, -1)
	vals := []interface{}{}
	vals = append(vals, state, timestamp) //uint64(time.Now().UnixNano()/1000000)
	var strValues string
	for i, row := range calls {
		strValues += fmt.Sprintf("$%v ", i+3)
		vals = append(vals, row.Uuid)
	}
	sqlStr = strings.Replace(sqlStr, "#values#", strValues, -1)
	return repo.dbHandler.ExecuteQuery(sqlStr, vals...)
}

func (repo *DbCdrBRepo) CreateTableIfNotExist() error {
	sqlStr := strings.Replace(strings.Replace(cdrCreateTableB, "#table#", config.TableB, -1), "#user#", config.User, -1)
	return repo.dbHandler.CreateTable(sqlStr)
}
