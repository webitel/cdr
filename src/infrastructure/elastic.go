package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"

	elastic "gopkg.in/olivere/elastic.v5"
	"webitel.com/cdr_service/conf"
	"webitel.com/cdr_service/entity"
	"webitel.com/cdr_service/logger"
)

type ElasticHandler struct {
	Client *elastic.Client
	Ctx    context.Context
}

var elasticConfig conf.Elastic

func NewElasticHandler() (*ElasticHandler, error) {
	elasticHandler := new(ElasticHandler)
	//elasticConfig = conf.GetElastic()
	err := elasticHandler.Init()
	return elasticHandler, err
}

func (handler *ElasticHandler) Init() error {
	elasticConfig = conf.GetElastic()
	var templateMap string
	if bytes, err := json.Marshal(elasticConfig.ElasticTemplate.Body); err == nil {
		templateMap = string(bytes)
	} else {
		return err
	}
	ctx := context.Background()
	eClient, err := elastic.NewClient(elastic.SetURL(elasticConfig.Url), elastic.SetSniff(false))
	if err != nil {
		return err
	}
	info, code, err := eClient.Ping(elasticConfig.Url).Do(ctx)
	if err != nil {
		return err
	}
	handler.Client = eClient
	handler.Ctx = ctx
	logger.Info("Elasticsearch returned with code %d and version %s\n", code, info.Version.Number)
	if err := handler.templatePrepare(templateMap); err != nil {
		return err
	}
	if err := handler.indexPrepare(); err != nil {
		return err
	}
	return nil
}

func (handler *ElasticHandler) templatePrepare(templateMap string) error {
	exists, err := handler.Client.IndexTemplateExists(elasticConfig.ElasticTemplate.Name).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !exists {
		// Create a new index.
		createTemplate, err := handler.Client.IndexPutTemplate(elasticConfig.ElasticTemplate.Name).Name(elasticConfig.ElasticTemplate.Name).BodyString(templateMap).Do(handler.Ctx)
		if err != nil {
			return err
		}
		if !createTemplate.Acknowledged || createTemplate == nil {
			return fmt.Errorf("Template is not acknowledged")
			// Not acknowledged
		}
	}
	logger.Notice("Elastic: put template")
	return nil
}

func (handler *ElasticHandler) indexPrepare() error {
	exists, err := handler.Client.IndexExists(elasticConfig.IndexName).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !exists {
		// Create a new index.
		createIndex, err := handler.Client.CreateIndex(elasticConfig.IndexName).Do(handler.Ctx)
		if err != nil {
			return err
		}
		if !createIndex.Acknowledged || createIndex == nil {
			return fmt.Errorf("Index is not acknowledged")
			// Not acknowledged
		}
	}
	logger.Notice("Elastic: put index")
	return nil
}

func (handler *ElasticHandler) BulkInsert(calls []entity.ElasticCdr) error {
	bulkRequest := handler.Client.Bulk()
	for _, item := range calls {
		req := elastic.NewBulkUpdateRequest().Index(elasticConfig.IndexName).Type(elasticConfig.TypeName).RetryOnConflict(5).Id(item.Uuid). /*Upsert(map[string]interface{}{"legs_b": make([]bool, 0)}).*/ DocAsUpsert(true).Doc(item) //entity.LegA{ElasticCdr: &item, LegB: make([]bool, 0)})
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err
	}
	if res.Errors {
		return fmt.Errorf("Leg A: Bad response. Request has errors.")
	}
	return nil
}

func (handler *ElasticHandler) BulkUpdateLegs(calls []entity.ElasticCdr) error {
	//var a []Huy
	// for index, _ := range calls {
	// 	a = append(a, Huy{calls[index].Uuid, index})
	// 	calls[index].Parent_uuid = "044a2714-be51-4476-b602-9a43188db08f"
	// }
	bulkRequest := handler.Client.Bulk()
	for _, item := range calls {
		req := elastic.NewBulkUpdateRequest().Index(elasticConfig.IndexName).Type(elasticConfig.TypeName).Id(item.Parent_uuid).RetryOnConflict(5).Upsert(map[string]interface{}{"legs_b": make([]bool, 0)}).ScriptedUpsert(true).Script(elastic.NewScriptInline("if(ctx._source.containsKey(\"legs_b\")){ctx._source.legs_b.add(params.v);}else{ctx._source.legs_b = new ArrayList(); ctx._source.legs_b.add(params.v);}").Lang("painless").Param("v", item))
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err
	}
	if res.Errors {
		return fmt.Errorf("Leg B: Bad response. Request has errors.")
	}
	return nil
}

// type Huy struct {
// 	Uuid string `json:"uuid"`
// 	Huy  int    `json:"huy"`
// }
