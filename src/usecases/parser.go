package usecases

import (
	"strings"

	"webitel.com/cdr_service/entity"
)

func getString(i interface{}) (s string) {
	s, _ = i.(string)
	return
}

func getUint(i interface{}) (s uint32) {
	s, _ = i.(uint32)
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
		createdTime, progressTime, answeredTime, bridgedTime, hangupTime     string = getFromTimes(call)
		queue_name                                                           string = getQueueName(variables)
		extension                                                            string = getExtension(variables)
		queue_hangup                                                         string = getQueueHangup(variables)
		queue_waiting                                                        uint32 = getQueueWaiting(variables)
		queue_call_duration                                                  uint32 = getQueueCallDuration(variables)
	)

	e_entity := entity.ElasticCdr{
		Parent_uuid:    getParentUuid(callInterface),
		Uuid:           getString(variables["uuid"]),
		Direction:      getString(variables["webitel_direction"]),
		CallerIdName:   callerIdName,
		CallerIdNumber: callerIdNumber,
		//CalleeIdName         string `json:"callee_id_name"`   //???????????????????????
		//CalleeIdNumber       string `json:"callee_id_number"` //???????????????????????
		NetworkAddr:          networkAddr,
		DestinationNumber:    destinationNumber,
		DomainName:           getString(variables["domain_name"]),
		Extension:            extension,
		PresenceId:           getString(variables["presence_id"]),
		Source:               source,
		Gateway:              getString(variables["webitel_gateway"]),
		Q850HangupCode:       getUint(variables["hangup_cause_q850"]),
		HangupCause:          getString(variables["hangup_cause"]),
		OriginateDisposition: getString(variables["originate_disposition"]),
		//times
		BridgedTime:           bridgedTime,
		CallAnswerTime:        answeredTime,
		ProgressTime:          progressTime,
		CallHangupTime:        hangupTime,
		CallCreatedTime:       createdTime,
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
			Geo:         "",
			City:        "",
			Country:     "",
			CountryCode: "",
			Type:        "",
		},
		Queue: &entity.Queue{
			CC_Queue_Name:          queue_name,
			Queue_CallDuration:     queue_call_duration,
			Queue_WaitingDuration:  queue_waiting,
			CC_CancelReason:        getString(variables["cc_cancel_reason"]),
			CC_Cause:               getString(variables["cc_cause"]),
			CC_Queue_AnsweredEpoch: getString(variables["cc_queue_answered_epoch"]),
			CC_Queue_Hangup:        queue_hangup,
			CC_Queue_JoinedEpoch:   getString(variables["cc_queue_joined_epoch"]),
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
	return e_entity, nil
}

func getQueueName(variables map[string]interface{}) (queue_name string) {
	if q, ok := variables["cc_queue"].(string); ok {
		queue_name = q
	} else if q, ok := variables["dlr_queue"].(string); ok {
		queue_name = q
	}
	return
}

// func getBridgeEpoch(variables map[string]interface{}) (bridgedEpoch uint64) {
// 	if b, ok := variables["bridge_epoch"].(uint64); ok {
// 		bridgedEpoch = b
// 	} else if c, ok := variables["cc_queue_answered_epoch"].(uint64); ok {
// 		bridgedEpoch = c
// 	}
// 	return
// }

// func getAnswered(variables map[string]interface{}) (answered bool) {
// 	if a, ok := variables["answer_epoch"].(uint32); ok {
// 		answered = a > 0
// 	}
// 	return
// }

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
				qualityPercentageAudio, _ = inbound["quality_percentage"].(uint32)
			}
		} else if video, ok := c["video"].(map[string]interface{}); ok {
			if inbound, ok := video["inbound"].(map[string]interface{}); ok {
				qualityPercentageVideo, _ = inbound["quality_percentage"].(uint32)
			}
		}
	}
	return
}

func getFromTimes(call map[string]interface{}) (createdTime, progressTime, answeredTime, bridgedTime, hangupTime string) {
	if c, ok := call["callflow"].([]interface{}); ok && len(c) > 0 {
		times, ok := c[0].(map[string]interface{})["times"].(map[string]interface{})
		if ok {
			createdTime, _ = times["created_time"].(string)
			progressTime, _ = times["progress_time"].(string)
			answeredTime, _ = times["answered_time"].(string)
			bridgedTime, _ = times["bridged_time"].(string)
			hangupTime, _ = times["hangup_time"].(string)
		}
	}
	return
}

func getExtension(variables map[string]interface{}) (extension string) {
	if a, ok := variables["cc_agent"].(string); ok {
		extension = a
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

func getQueueHangup(variables map[string]interface{}) (queue_hangup string) {
	if c, ok := variables["cc_queue_canceled_epoch"].(string); ok {
		queue_hangup = c
	} else if t, ok := variables["cc_queue_terminated_epoch"].(string); ok {
		queue_hangup = t
	}
	return
}

func getQueueWaiting(variables map[string]interface{}) (queue_waiting uint32) {
	var first, second uint32
	if a, ok := variables["cc_queue_answered_epoch"].(uint32); ok {
		first = a
	} else if c, ok := variables["cc_queue_canceled_epoch"].(uint32); ok {
		first = c
	} else if t, ok := variables["cc_queue_terminated_epoch"].(uint32); ok {
		first = t
	}
	second, _ = variables["cc_queue_joined_epoch"].(uint32)
	if first > second {
		queue_waiting = first - second
	}
	return
}

func getQueueCallDuration(variables map[string]interface{}) (queue_call_duration uint32) {
	var first, second uint32
	if c, ok := variables["cc_queue_canceled_epoch"].(uint32); ok {
		first = c
	} else if t, ok := variables["cc_queue_terminated_epoch"].(uint32); ok {
		first = t
	} else if e, ok := variables["end_epoch"].(uint32); ok {
		first = e
	}
	second, _ = variables["cc_queue_joined_epoch"].(uint32)
	if first > second {
		queue_call_duration = first - second
	}
	return
}

func getQueueAnswerDelay(variables map[string]interface{}) (queue_answer_delay uint32) {
	if a, ok := variables["cc_queue_answered_epoch"].(uint32); ok {
		if b, ok := variables["cc_queue_joined_epoch"].(uint32); ok && a > b {
			queue_answer_delay = a - b
		}
	}
	return
}
