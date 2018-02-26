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
	err := elasticHandler.Init()
	return elasticHandler, err
}

func (handler *ElasticHandler) Init() error {
	elasticConfig = conf.GetElastic()
	if !elasticConfig.Enabled {
		return nil
	}
	var cdrTemplateMap string
	if bytes, err := json.Marshal(elasticConfig.CdrTemplate.Body); err == nil {
		cdrTemplateMap = string(bytes)
	} else {
		return err
	}
	var accountsTemplateMap string
	if bytes, err := json.Marshal(elasticConfig.AccountsTemplate.Body); err == nil {
		accountsTemplateMap = string(bytes)
	} else {
		return err
	}
	ctx := context.Background()
	for c := time.Tick(5 * time.Second); ; <-c {
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
		logger.Debug("Elasticsearch returned with code %d and version %s", code, info.Version.Number)
		if err := handler.templatePrepare(elasticConfig.CdrTemplate, cdrTemplateMap); err != nil {
			logger.Error(err.Error())
			continue
		}
		if err := handler.templatePrepare(elasticConfig.AccountsTemplate, accountsTemplateMap); err != nil {
			logger.Error(err.Error())
			continue
		}
		break
	}
	return nil
}

func (handler *ElasticHandler) templatePrepare(template conf.ElasticTemplate, templateMap string) error {
	exists, err := handler.Client.IndexTemplateExists(template.Name).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !exists {
		// Create a new template.
		if err := handler.createTemplate(template.Name, templateMap); err != nil {
			return err
		}
	} else if elasticConfig.DeleteTemplate {
		deleteTemplate, err := handler.Client.IndexDeleteTemplate(template.Name).Name(template.Name).Do(handler.Ctx)
		if err != nil {
			return err
		}
		if !deleteTemplate.Acknowledged || deleteTemplate == nil {
			return fmt.Errorf("Template is not acknowledged")
		}
		if err := handler.createTemplate(template.Name, templateMap); err != nil {
			return err
		}
	}
	return nil
}

func (handler *ElasticHandler) createTemplate(templateName, templateMap string) error {
	createTemplate, err := handler.Client.IndexPutTemplate(templateName).Name(templateName).BodyString(templateMap).Do(handler.Ctx)
	if err != nil {
		return err
	}
	if !createTemplate.Acknowledged || createTemplate == nil {
		return fmt.Errorf("Template is not acknowledged")
		// Not acknowledged
	}
	logger.Debug("Elastic: put template: %s", templateName)
	return nil
}

func (handler *ElasticHandler) BulkInsert(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr) {
	bulkRequest := handler.Client.Bulk()
	for _, item := range calls {
		var tmpDomain string
		if item.DomainName != "" && !strings.ContainsAny(item.DomainName, ", & * & \\ & < & | & > & / & ?") {
			tmpDomain = "-" + item.DomainName
		}
		logger.DebugElastic("Elastic bulk item [Leg "+item.Leg+"]:", item.Uuid, item.DomainName)
		req := elastic.NewBulkUpdateRequest().Index(fmt.Sprintf("%s-%s-%v%v", elasticConfig.IndexName, strings.ToLower(item.Leg), time.Now().UTC().Year(), tmpDomain)).Type(elasticConfig.TypeName).RetryOnConflict(5).Id(item.Uuid).DocAsUpsert(true).Doc(item)
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err, nil, nil
	}
	if res.Errors {
		var successCalls, errorCalls []entity.SqlCdr
		for _, item := range res.Items {
			if item["update"].Error != nil {
				errorCalls = append(errorCalls, entity.SqlCdr{Uuid: item["update"].Id})
				logger.ErrorElastic("Elastic [Leg A]", item["update"].Id, item["update"].Error.Type, item["update"].Index, item["update"].Error.Reason)
			} else {
				successCalls = append(successCalls, entity.SqlCdr{Uuid: item["update"].Id})
			}
		}
		return fmt.Errorf("Leg A: Bad response. Request has errors."), errorCalls, successCalls
	}
	return nil, nil, nil
}

func (handler *ElasticHandler) BulkStatus(accounts []entity.Account) (error, []entity.Account, []entity.Account) {
	bulkRequest := handler.Client.Bulk()
	for _, item := range accounts {
		var tmpDomain string
		if item.Domain != "" && !strings.ContainsAny(item.Domain, ", & * & \\ & < & | & > & / & ?") {
			tmpDomain = "-" + item.Domain
		}
		logger.DebugAccount("Elastic bulk item [Accounts]:", item.Name, item.Account, item.Domain)
		req := elastic.NewBulkUpdateRequest().Index(fmt.Sprintf("%s-%v%v", elasticConfig.IndexName, time.Now().UTC().Year(), tmpDomain)).Type(elasticConfig.TypeName).RetryOnConflict(5).Id(item.Uuid).Doc(item)
		bulkRequest = bulkRequest.Add(req)
	}
	res, err := bulkRequest.Do(handler.Ctx)
	if err != nil {
		return err, nil, nil
	}
	if res.Errors {
		var successAcc, errorAcc []entity.Account
		for _, item := range res.Items {
			if item["update"].Error != nil {
				errorAcc = append(errorAcc, entity.Account{Uuid: item["update"].Id})
				logger.ErrorElastic("Elastic [Accounts]", item["update"].Id, item["update"].Error.Type, item["update"].Index, item["update"].Error.Reason)
			} else {
				successAcc = append(successAcc, entity.Account{Uuid: item["update"].Id})
			}
		}
		return fmt.Errorf("Accounts: Bad response. Request has errors."), errorAcc, successAcc
	}
	return nil, nil, nil
}

// func (handler *ElasticHandler) BulkUpdateLegs(calls []entity.ElasticCdr) (error, []entity.SqlCdr, []entity.SqlCdr) {
// 	bulkRequest := handler.Client.Bulk()
// 	for _, item := range calls {
// 		var tmpDomain string
// 		if item.DomainName != "" && !strings.ContainsAny(item.DomainName, ", & * & \\ & < & | & > & / & ?") {
// 			tmpDomain = "-" + item.DomainName
// 		}
// 		logger.DebugElastic("Elastic bulk item [Leg B]:", item.Uuid, item.DomainName)
// 		req := elastic.NewBulkUpdateRequest().Index(fmt.Sprintf("%s-%v%v", elasticConfig.IndexName, time.Now().UTC().Year(), tmpDomain)).Type(elasticConfig.TypeName).Id(item.Parent_uuid).RetryOnConflict(5).Upsert(map[string]interface{}{"legs_b": make([]bool, 0)}).ScriptedUpsert(true).Script(elastic.NewScriptInline("if(ctx._source.containsKey(\"legs_b\")){ctx._source.legs_b.add(params.v);}else{ctx._source.legs_b = new ArrayList(); ctx._source.legs_b.add(params.v);}").Lang("painless").Param("v", item))
// 		bulkRequest = bulkRequest.Add(req)
// 	}
// 	res, err := bulkRequest.Do(handler.Ctx)
// 	if err != nil {
// 		return err, nil, nil
// 	}
// 	if res.Errors {
// 		var successCalls, errorCalls []entity.SqlCdr
// 		for _, item := range res.Items {
// 			if item["update"].Error != nil {
// 				errorCalls = append(errorCalls, entity.SqlCdr{Uuid: item["update"].Id})
// 				logger.ErrorElastic("Elastic [Leg B]", item["update"].Id, item["update"].Error.Type, item["update"].Index, item["update"].Error.Reason)
// 			} else {
// 				successCalls = append(successCalls, entity.SqlCdr{Uuid: item["update"].Id})
// 			}
// 		}
// 		return fmt.Errorf("Leg B: Bad response. Request has errors."), errorCalls, successCalls
// 	}
// 	return nil, nil, nil
// }
