package usecases

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/webitel/cdr/src/entity"
)

func getString(i interface{}) (s string) {
	s, _ = i.(string)
	return
}

func getUint(i interface{}) (s uint32) {
	switch t := i.(type) {
	case string:
		{
			integer, _ := strconv.Atoi(t)
			s = uint32(integer)
			return
		}
	case float64:
		{
			s = uint32(t)
			return
		}
	}
}

func getUintFromFloat64(i interface{}) (s uint64) {
	fl, _ := i.(float64)
	s = uint64(fl)
	return
}

// func getUint64(i interface{}) (s uint64) {
// 	s, _ = i.(uint64)
// 	return
// }

// func getMapString(i interface{}) (s map[string]string) {
// 	s = map[string]string(i.(map[string]interface{}))
// 	fmt.Sprintf("%s", ok)
// 	return
// }

func ParseToCdr(callInterface interface{}) (entity.ElasticCdr, error) {
	var (
		call, _                                                                     = callInterface.(map[string]interface{})
		variables, _                                                                = call["variables"].(map[string]interface{})
		callerIdNumber, destinationNumber, callerIdName, source, networkAddr string = getFromProfile(call, variables)
		qualityPercentageAudio, qualityPercentageVideo                       uint32 = getFromStats(call)
		//createdTime, progressTime, answeredTime, bridgedTime, hangupTime, transferTime uint64 = getFromTimes(call)
		createdTime          uint64 = getFromTimes(call)
		domain_name          string = getDomainName(variables)
		queue_name           string = getQueueName(variables)
		extension            string = getExtension(variables)
		queue_hangup         uint64 = getQueueHangup(variables, call)
		queue_answered_epoch uint64 = getQueueAnswered(variables) * 1000
		queue_joined_epoch   uint64 = getQueueJoined(variables) * 1000
		queue_waiting        uint32 = getQueueWaiting(variables)
		queue_call_duration  uint32 = getQueueCallDuration(variables)
		hangup_disposition   string = getHangupDisposition(variables)
	)

	e_entity := entity.ElasticCdr{
		Parent_uuid:          getParentUuid(callInterface),
		Uuid:                 getString(variables["uuid"]),
		Direction:            getString(variables["webitel_direction"]),
		CallerIdName:         callerIdName,
		CallerIdNumber:       callerIdNumber,
		NetworkAddr:          networkAddr,
		DestinationNumber:    destinationNumber,
		DomainName:           domain_name,
		Extension:            extension,
		PresenceId:           getString(variables["presence_id"]),
		Source:               source,
		Gateway:              getString(variables["webitel_gateway"]),
		Q850HangupCode:       getUint(variables["hangup_cause_q850"]),
		HangupCause:          getString(variables["hangup_cause"]),
		HangupDisposition:    hangup_disposition,
		OriginateDisposition: getString(variables["originate_disposition"]),
		TransferDisposition:  getString(variables["transfer_disposition"]),
		CallCreatedTime:      createdTime,
		//
		Duration:              getUint(variables["duration"]),
		ConnectedCallDuration: getUint(variables["billsec"]),
		ProgressSeconds:       getUint(variables["progresssec"]),
		AnswerSeconds:         getUint(variables["answersec"]),
		WaitSeconds:           getUint(variables["waitsec"]),
		HoldAccumSeconds:      getUint(variables["hold_accum_seconds"]),
		//
		QualityPercentageAudio: qualityPercentageAudio,
		QualityPercentageVideo: qualityPercentageVideo,
		Variables:              variables,

		Locations: &entity.Locations{
			Geo:         getString(variables["webitel_location"]),
			City:        getString(variables["webitel_location_city"]),
			Country:     getString(variables["webitel_location_country"]),
			CountryCode: getString(variables["webitel_location_country_code"]),
			Type:        getString(variables["webitel_location_type"]),
		},
		Queue: &entity.Queue{
			CC_Queue_Name:          queue_name,
			Queue_CallDuration:     queue_call_duration,
			Queue_WaitingDuration:  queue_waiting,
			CC_CancelReason:        getString(variables["cc_cancel_reason"]),
			CC_Cause:               getString(variables["cc_cause"]),
			CC_Queue_AnsweredEpoch: queue_answered_epoch,
			CC_Queue_Hangup:        queue_hangup,
			CC_Queue_JoinedEpoch:   queue_joined_epoch,
			CC_Side:                getString(variables["cc_side"]),
		},
	}
	for _, item := range entity.IgnoredList {
		delete(e_entity.Variables, item)
	}
	for k, _ := range e_entity.Variables {
		if strings.Index(k, "verto_") == 0 {
			delete(e_entity.Variables, k)
		}
	}
	if *e_entity.Queue == (entity.Queue{}) {
		e_entity.Queue = nil
	}
	if *e_entity.Locations == (entity.Locations{}) {
		e_entity.Locations = nil
	}
	/////////////////////////////////
	if e_entity.Parent_uuid == "" {
		e_entity.Leg = "A"
	} else {
		e_entity.Leg = "B"
	}
	//if e_entity.Parent_uuid == "" {
	byteArr, _ := json.Marshal(call["callflow"])
	var tmpCf []entity.Callflow
	json.Unmarshal(byteArr, &tmpCf)
	if len(tmpCf) > 0 {
		e_entity.Callflow = &tmpCf
		setMillis(e_entity.Callflow)
	}
	// } else {
	// 	e_entity.BridgedTime = bridgedTime
	// 	e_entity.CallAnswerTime = answeredTime
	// 	e_entity.ProgressTime = progressTime
	// 	e_entity.CallHangupTime = hangupTime
	// 	e_entity.TransferTime = transferTime
	// }
	return e_entity, nil
}

func setMillis(cf *[]entity.Callflow) {
	for i, _ := range *cf {
		(*cf)[i].CreatedTime = (*cf)[i].CreatedTime / 1000
		(*cf)[i].ProfileCreatedTime = (*cf)[i].ProfileCreatedTime / 1000
		(*cf)[i].ProgressTime = (*cf)[i].ProgressTime / 1000
		(*cf)[i].ProgressMediaTime = (*cf)[i].ProgressMediaTime / 1000
		(*cf)[i].AnsweredTime = (*cf)[i].AnsweredTime / 1000
		(*cf)[i].BridgedTime = (*cf)[i].BridgedTime / 1000
		(*cf)[i].LastHoldTime = (*cf)[i].LastHoldTime / 1000
		(*cf)[i].HoldAccumTime = (*cf)[i].HoldAccumTime / 1000
		(*cf)[i].HangupTime = (*cf)[i].HangupTime / 1000
		(*cf)[i].ResurrectTime = (*cf)[i].ResurrectTime / 1000
		(*cf)[i].TransferTime = (*cf)[i].TransferTime / 1000
	}

}

func getQueueName(variables map[string]interface{}) (queue_name string) {
	if q, ok := variables["cc_queue"].(string); ok {
		s := strings.Split(q, "@")
		if len(s) > 0 {
			queue_name = s[0]
		}
	} else if q, ok := variables["dlr_queue"].(string); ok {
		s := strings.Split(q, "@")
		if len(s) > 0 {
			queue_name = s[0]
		}
	}
	return
}

func getDomainName(variables map[string]interface{}) (domain_name string) {
	if d, ok := variables["domain_name"].(string); ok {
		domain_name = d
	} else if p, ok := variables["presence_id"].(string); ok {
		s := strings.Split(p, "@")
		if len(s) > 0 {
			domain_name = s[len(s)-1]
		}
	}
	return
}

func getFromProfile(call, variables map[string]interface{}) (callerIdNumber, destinationNumber, callerIdName, source, networkAddr string) {
	if c, ok := call["callflow"].([]interface{}); ok && len(c) > 0 {
		callflow, ok := c[0].(map[string]interface{})["caller_profile"].(map[string]interface{})
		if ok {
			callerIdNumber, _ = callflow["caller_id_number"].(string)
			callerIdName, _ = callflow["caller_id_name"].(string)
			destinationNumber, _ = callflow["destination_number"].(string)
			source, _ = callflow["source"].(string)
			networkAddr, _ = callflow["network_addr"].(string)
		} else {
			destinationNumber, _ = variables["destination_number"].(string)
		}
	}
	return
}

func getFromStats(call map[string]interface{}) (qualityPercentageAudio, qualityPercentageVideo uint32) {
	if c, ok := call["callStats"].(map[string]interface{}); ok {
		if audio, ok := c["audio"].(map[string]interface{}); ok {
			if inbound, ok := audio["inbound"].(map[string]interface{}); ok {
				qualityPercentageAudio = uint32(getUintFromFloat64(inbound["quality_percentage"]))
			}
		} else if video, ok := c["video"].(map[string]interface{}); ok {
			if inbound, ok := video["inbound"].(map[string]interface{}); ok {
				qualityPercentageVideo = uint32(getUintFromFloat64(inbound["quality_percentage"]))
			}
		}
	}
	return
}

func getFromTimes(call map[string]interface{}) (createdTime /*, progressTime, answeredTime, bridgedTime, hangupTime, transferTime*/ uint64) {
	if c, ok := call["callflow"].([]interface{}); ok && len(c) > 0 {
		times, ok := c[0].(map[string]interface{})["times"].(map[string]interface{})
		if ok {
			createdTime = getUintFromFloat64(times["created_time"]) / 1000 //sqlStr[0 : len(sqlStr)-3]
			// progressTime = getUintFromFloat64(times["progress_time"]) / 1000
			// answeredTime = getUintFromFloat64(times["answered_time"]) / 1000
			// bridgedTime = getUintFromFloat64(times["bridged_time"]) / 1000
			// hangupTime = getUintFromFloat64(times["hangup_time"]) / 1000
			// transferTime = getUintFromFloat64(times["transfer_time"]) / 1000
		}
	}
	return
}

func getExtension(variables map[string]interface{}) (extension string) {
	if a, ok := variables["cc_agent"].(string); ok {
		s := strings.Split(a, "@")
		if len(s) > 0 {
			extension = s[0]
		}
	} else if u, ok := variables["presence_id"].(string); ok {
		s := strings.Split(u, "@")
		if len(s) > 0 {
			extension = s[0]
		}
	} else if u, ok := variables["dialer_user"].(string); ok {
		s := strings.Split(u, "@")
		if len(s) > 0 {
			extension = s[0]
		}
	}
	return
}

func getHangupDisposition(variables map[string]interface{}) (hangup_disposition string) {
	if s, ok := variables["hangup_disposition"].(string); ok {
		hangup_disposition = s
	} else if s, ok := variables["sip_hangup_disposition"].(string); ok {
		hangup_disposition = s
	} else if s, ok := variables["verto_hangup_disposition"].(string); ok {
		hangup_disposition = s
	}
	return
}

func getQueueHangup(variables, call map[string]interface{}) (queue_hangup uint64) {
	if _, ok := variables["cc_queue"].(string); ok {
		if c, ok := variables["cc_queue_canceled_epoch"].(string); ok && len(c) > 3 {
			queue_hangup, _ = strconv.ParseUint(c, 10, 64)
			queue_hangup = queue_hangup * 1000
		} else if t, ok := variables["cc_queue_terminated_epoch"].(string); ok && len(c) > 3 {
			queue_hangup, _ = strconv.ParseUint(t, 10, 64)
			queue_hangup = queue_hangup * 1000
		} else if c, ok := call["callflow"].([]interface{}); ok && len(c) > 0 {
			times, ok := c[0].(map[string]interface{})["times"].(map[string]interface{})
			if ok {
				queue_hangup = getUintFromFloat64(times["hangup_time"]) / 1000
			}
		}
	}
	return
}

func getQueueAnswered(variables map[string]interface{}) (queue_answered_epoch uint64) {
	if c, ok := variables["cc_queue_answered_epoch"].(string); ok && len(c) > 3 {
		queue_answered_epoch, _ = strconv.ParseUint(c, 10, 64)
	}
	return
}

func getQueueJoined(variables map[string]interface{}) (queue_joined_epoch uint64) {
	if c, ok := variables["cc_queue_joined_epoch"].(string); ok && len(c) > 3 {
		queue_joined_epoch, _ = strconv.ParseUint(c, 10, 64)
	}
	return
}

func getQueueWaiting(variables map[string]interface{}) (queue_waiting uint32) {
	var first, second uint32
	if a, ok := variables["cc_queue_answered_epoch"].(string); ok {
		first64, _ := strconv.ParseUint(a, 10, 32)
		first = uint32(first64)
	} else if c, ok := variables["cc_queue_canceled_epoch"].(string); ok {
		first64, _ := strconv.ParseUint(c, 10, 32)
		first = uint32(first64)
	} else if t, ok := variables["cc_queue_terminated_epoch"].(string); ok {
		first64, _ := strconv.ParseUint(t, 10, 32)
		first = uint32(first64)
	}
	if sec, ok := variables["cc_queue_joined_epoch"].(string); ok {
		second64, _ := strconv.ParseUint(sec, 10, 32)
		second = uint32(second64)
	}
	if first > second {
		queue_waiting = first - second
	}
	return
}

func getQueueCallDuration(variables map[string]interface{}) (queue_call_duration uint32) {
	var first, second uint32
	if c, ok := variables["cc_queue_canceled_epoch"].(string); ok {
		first64, _ := strconv.ParseUint(c, 10, 32)
		first = uint32(first64)
	} else if t, ok := variables["cc_queue_terminated_epoch"].(string); ok {
		first64, _ := strconv.ParseUint(t, 10, 32)
		first = uint32(first64)
	}
	if sec, ok := variables["cc_queue_joined_epoch"].(string); ok {
		second64, _ := strconv.ParseUint(sec, 10, 32)
		second = uint32(second64)
	}
	if first > second {
		queue_call_duration = first - second
	}
	return
}

func getQueueAnswerDelay(variables map[string]interface{}) (queue_answer_delay uint32) {
	if a, ok := variables["cc_queue_answered_epoch"].(string); ok {
		if b, ok := variables["cc_queue_joined_epoch"].(string); ok && a > b {
			a64, _ := strconv.ParseUint(a, 10, 32)
			b64, _ := strconv.ParseUint(b, 10, 32)
			queue_answer_delay = uint32(a64 - b64)
		}
	}
	return
}

func GenerateUuid() (uuid string) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return
	}
	uuid = strings.ToLower(fmt.Sprintf("%X-%X-%X-%X-%X", b[0:4], b[4:6], b[6:8], b[8:10], b[10:]))
	return
}
