package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/webitel/cdr/src/conf"
	"github.com/webitel/cdr/src/entity"
	"github.com/webitel/cdr/src/logger"
	elastic "gopkg.in/olivere/elastic.v5"
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
	if !elasticConfig.Enabled {
		return nil
	}
	var templateMap string
	if bytes, err := json.Marshal(elasticConfig.ElasticTemplate.Body); err == nil {
		templateMap = string(bytes)
	} else {
		return err
	}
	ctx := context.Background()
	ticker := time.NewTicker(5 * time.Second)
	for {
		select {
		case <-ticker.C:
			eClient, err := elastic.NewClient(elastic.SetURL(elasticConfig.Url), elastic.SetSniff(false))
			if err != nil {
				logger.Error(err.Error())
				continue
			}
			info, code, err := eClient.Ping(elasticConfig.Url).Do(ctx)
			if err != nil {
				logger.Error(err.Error())
				continue
			}
			handler.Client = eClient
			handler.Ctx = ctx
			logger.Info("Elasticsearch returned with code %d and version %s\n", code, info.Version.Number)
			if err := handler.templatePrepare(templateMap); err != nil {
				logger.Error(err.Error())
				continue
			}
			// if err := handler.indexPrepare(); err != nil {
			// 	logger.Error(err.Error())
			// 	continue
			// }
			ticker.Stop()
			return nil
		}
	}
}

func (handler *ElasticHandler) templatePrepare(templateMap string) error {
	exists, err := handler.Client.IndexTemplateExists(elasticConfig.ElasticTemplate.Name).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !exists {
		// Create a new index.
		if err := handler.createTemplate(templateMap); err != nil {
			return err
		}
	} else if elasticConfig.DeleteTemplate {
		deleteTemplate, err := handler.Client.IndexDeleteTemplate(elasticConfig.ElasticTemplate.Name).Name(elasticConfig.ElasticTemplate.Name).Do(handler.Ctx)
		if err != nil {
			return err
		}
		if !deleteTemplate.Acknowledged || deleteTemplate == nil {
			return fmt.Errorf("Template is not acknowledged")
		}
		if err := handler.createTemplate(templateMap); err != nil {
			return err
		}
	}
	return nil
}

func (handler *ElasticHandler) createTemplate(templateMap string) error {
	createTemplate, err := handler.Client.IndexPutTemplate(elasticConfig.ElasticTemplate.Name).Name(elasticConfig.ElasticTemplate.Name).BodyString(templateMap).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !createTemplate.Acknowledged || createTemplate == nil {
		return fmt.Errorf("Template is not acknowledged")
		// Not acknowledged
	}
	logger.Info("Elastic: put template")
	return nil
}

// func (handler *ElasticHandler) indexPrepare() error {
// 	exists, err := handler.Client.IndexExists(elasticConfig.IndexName).Do(handler.Ctx)
// 	if err != nil {
// 		return err
// 	}
// 	if !exists {
// 		// Create a new index.
// 		createIndex, err := handler.Client.CreateIndex(elasticConfig.IndexName).Do(handler.Ctx)
// 		if err != nil {
// 			return err
// 		}
// 		if !createIndex.Acknowledged || createIndex == nil {
// 			return fmt.Errorf("Index is not acknowledged")
// 			// Not acknowledged
// 		}
// 	}
// 	logger.Notice("Elastic: put index")
// 	return nil
// }

func (handler *ElasticHandler) BulkInsert(calls []entity.ElasticCdr) error {
	bulkRequest := handler.Client.Bulk()
	for _, item := range calls {
		var tmpDomain string
		if item.DomainName != "" && !strings.ContainsAny(item.DomainName, ", & * & \\ & < & | & > & / & ?") {
			tmpDomain = "-" + item.DomainName
		}
		req := elastic.NewBulkUpdateRequest().Index(fmt.Sprintf("%s-%v%v", elasticConfig.IndexName, time.Now().UTC().Year(), tmpDomain)).Type(elasticConfig.TypeName).RetryOnConflict(5).Id(item.Uuid). /*Upsert(map[string]interface{}{"legs_b": make([]bool, 0)}).*/ DocAsUpsert(true).Doc(item) //entity.LegA{ElasticCdr: &item, LegB: make([]bool, 0)})
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err
	}
	if res.Errors {
		for _, item := range res.Items {
			if item["update"].Error != nil {
				logger.Error(fmt.Sprintf("LEG A. ID: %v; ERROR TYPE: %v; REASON: %v", item["update"].Id, item["update"].Error.Type, item["update"].Error.Reason))
			}
		}
		return fmt.Errorf("Leg A: Bad response. Request has errors.")
	}
	return nil
}

func (handler *ElasticHandler) BulkUpdateLegs(calls []entity.ElasticCdr) error {
	bulkRequest := handler.Client.Bulk()
	for _, item := range calls {
		var tmpDomain string
		if item.DomainName != "" {
			tmpDomain = "-" + item.DomainName
		}
		req := elastic.NewBulkUpdateRequest().Index(fmt.Sprintf("%s-%v%v", elasticConfig.IndexName, time.Now().UTC().Year(), tmpDomain)).Type(elasticConfig.TypeName).Id(item.Parent_uuid).RetryOnConflict(5).Upsert(map[string]interface{}{"legs_b": make([]bool, 0)}).ScriptedUpsert(true).Script(elastic.NewScriptInline("if(ctx._source.containsKey(\"legs_b\")){ctx._source.legs_b.add(params.v);}else{ctx._source.legs_b = new ArrayList(); ctx._source.legs_b.add(params.v);}").Lang("painless").Param("v", item))
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err
	}
	if res.Errors {
		for _, item := range res.Items {
			if item["update"].Error != nil {
				logger.Error(fmt.Sprintf("LEG B. ID: %v; ERROR TYPE: %v; REASON: %v", item["update"].Id, item["update"].Error.Type, item["update"].Error.Reason))
			}
		}
		return fmt.Errorf("Leg B: Bad response. Request has errors.")
	}
	return nil
}
