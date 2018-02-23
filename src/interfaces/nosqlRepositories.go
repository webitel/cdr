package interfaces

import "github.com/webitel/cdr/src/entity"

type NosqlHandler interface {
	BulkInsert(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr)
	BulkUpdateLegs(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr)
}

type DocRepo struct {
	nosqlHandlers map[string]NosqlHandler
	nosqlHandler  NosqlHandler
}

type DocCdrARepo DocRepo
type DocCdrBRepo DocRepo

func NewDocCdrARepo(nosqlHandlers map[string]NosqlHandler) *DocCdrARepo {
	DocCdrARepo := new(DocCdrARepo)
	DocCdrARepo.nosqlHandlers = nosqlHandlers
	DocCdrARepo.nosqlHandler = nosqlHandlers["DocCdrARepo"]
	return DocCdrARepo
}

func NewDocCdrBRepo(nosqlHandlers map[string]NosqlHandler) *DocCdrBRepo {
	DocCdrBRepo := new(DocCdrBRepo)
	DocCdrBRepo.nosqlHandlers = nosqlHandlers
	DocCdrBRepo.nosqlHandler = nosqlHandlers["DocCdrBRepo"]
	return DocCdrBRepo
}

func (repo *DocCdrARepo) InsertDocs(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr) {
	return repo.nosqlHandler.BulkInsert(calls)
}

func (repo *DocCdrBRepo) InsertDocs(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr) {
	//return repo.nosqlHandler.BulkUpdateLegs(calls)
	return repo.nosqlHandler.BulkInsert(calls)
}
