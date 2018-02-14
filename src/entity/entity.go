package entity

type SqlCdrRepository interface {
	InsertPack(calls []SqlCdr) error
	SelectPackByState(count uint32, state uint8, stateName string) ([]SqlCdr, error)
	UpdateState(calls []SqlCdr, state uint8, timestamp uint64, stateName string) error
	JoinLegsPack(count uint32) ([]SqlCdr, error)
	CreateTableIfNotExist() error
}

type SqlCdrARepository SqlCdrRepository
type SqlCdrBRepository SqlCdrRepository

type ElasticCdrRepository interface {
	//AddCdrToElastic(call ElasticCdr) error
	InsertDocs(calls []ElasticCdr) error
}

type ElasticCdrARepository ElasticCdrRepository
type ElasticCdrBRepository ElasticCdrRepository

// type AmqRepository interface {
// 	CreateAmqConnection(connectionString, exchangeName, exchangeType string)
// 	GetMessages(exchName, exchType, routingKey string) (<-chan Delivery, error)
// 	SendMessage(calls []SqlCdr, exchName, routingKey string) error
// }

// type AmqPublisherRepository AmqRepository
// type AmqReceiverRepository AmqRepository

type AmqPublisherRepository interface {
	CreateAmqConnection(connectionString, exchangeName, exchangeType string)
	GetMessages(exchName, exchType, routingKey string) (<-chan Delivery, error)
}

type AmqReceiverRepository interface {
	CreateAmqConnection(connectionString, exchangeName, exchangeType string)
	SendMessage(calls []SqlCdr, routingKey, exchName string) error
}

// Delivery implementes a single message delivery.
type Delivery interface {
	Ack(multiple bool) error
	Nack(multiple, requeue bool) error
	GetBody() []byte
}

type SqlCdr struct {
	Uuid           string
	Parent_uuid    string
	Created_at     uint64
	Stored_at      uint64
	Archived_at    uint64
	Size           uint32
	Stored_state   uint8
	Archived_state uint8
	Event          []byte
}

type ElasticCdr struct {
	Parent_uuid          string `json:"-"`
	Uuid                 string `json:"uuid"`
	Direction            string `json:"direction,omitempty"`
	CallerIdName         string `json:"caller_id_name,omitempty"`
	CallerIdNumber       string `json:"caller_id_number,omitempty"`
	CalleeIdName         string `json:"callee_id_name,omitempty"`   //???????????????????????
	CalleeIdNumber       string `json:"callee_id_number,omitempty"` //???????????????????????
	NetworkAddr          string `json:"network_addr,omitempty"`
	DestinationNumber    string `json:"destination_number,omitempty"`
	DomainName           string `json:"domain_name,omitempty"`
	Extension            string `json:"extension,omitempty"`
	PresenceId           string `json:"presence_id,omitempty"`
	Source               string `json:"source,omitempty"`
	Gateway              string `json:"gateway,omitempty"`
	Q850HangupCode       uint32 `json:"hangup_cause_q850"`
	HangupCause          string `json:"hangup_cause,omitempty"`
	OriginateDisposition string `json:"originate_disposition,omitempty"`
	//times
	BridgedTime     string `json:"bridged_time,omitempty"`
	CallAnswerTime  string `json:"answered_time,omitempty"`
	ProgressTime    string `json:"progress_time,omitempty"`
	CallHangupTime  string `json:"hangup_time,omitempty"`
	CallCreatedTime string `json:"created_time,omitempty"`
	///////
	Duration              uint32 `json:"duration"`
	ConnectedCallDuration uint32 `json:"billsec"`
	ProgressSeconds       uint32 `json:"progresssec"`
	AnswerSeconds         uint32 `json:"answersec"`
	WaitSeconds           uint32 `json:"waitsec"`
	HoldAccumSeconds      uint32 `json:"holdsec"`
	//
	QualityPercentageAudio uint32                 `json:"quality_percentage_audio,omitempty"`
	QualityPercentageVideo uint32                 `json:"quality_percentage_video,omitempty"`
	Variables              map[string]interface{} `json:"variables"`
	*Locations             `json:"locations,omitempty"`
	*Queue                 `json:"queue,omitempty"`
	//LegB                   []interface{} `json:"leg_b,omitempty"`
}

// func (e *ElasticCdr) GetUuid() string {
// 	return e.Uuid
// }

type Locations struct {
	Geo         string `json:"geo,omitempty"`
	City        string `json:"city,omitempty"`
	Country     string `json:"country,omitempty"`
	CountryCode string `json:"country_code,omitempty"`
	Type        string `json:"type,omitempty"`
}

type Queue struct {
	CC_Queue_Name          string `json:"name,omitempty"`
	Queue_CallDuration     uint32 `json:"duration"`
	Queue_WaitingDuration  uint32 `json:"wait_duration"`
	CC_CancelReason        string `json:"cancel_reason,omitempty"`
	CC_Cause               string `json:"cause,omitempty"`
	CC_Queue_AnsweredEpoch string `json:"answered_time,omitempty"`
	CC_Queue_Hangup        string `json:"hangup_time,omitempty"`
	CC_Queue_JoinedEpoch   string `json:"joined_time,omitempty"`
	CC_Side                string `json:"stop_side,omitempty"`
	//Queue_AnswerDelay      uint32 `json:"asa"`
}

var (
	IgnoredList = [...]string{
		"direction",
		"uuid",
		"session_id",
		"sip_from_user",
		"sip_from_uri",
		"sip_from_host",
		"video_media_flow",
		"channel_name",
		"ep_codec_string",
		"sip_local_network_addr",
		"sip_network_ip",
		"sip_network_port",
		"sip_invite_stamp",
		"sip_received_ip",
		"sip_received_port",
		"sip_via_protocol",
		"sip_from_user_stripped",
		"sofia_profile_name",
		"recovery_profile_name",
		"sip_allow",
		"sip_req_user",
		"sip_req_port",
		"sip_req_uri",
		"sip_req_host",
		"sip_to_user",
		"sip_to_uri",
		"sip_to_host",
		"sip_contact_params",
		"sip_contact_user",
		"sip_contact_port",
		"sip_contact_uri",
		"sip_contact_host",
		"sip_via_host",
		"sip_via_port",
		"sip_via_rport",
		"switch_r_sdp",
		"audio_media_flow",
		"rtp_audio_recv_pt",
		"rtp_use_codec_name",
		"rtp_use_codec_rate",
		"rtp_use_codec_ptime",
		"rtp_use_codec_channels",
		"rtp_last_audio_codec_string",
		"original_read_codec",
		"original_read_rate",
		"write_codec",
		"write_rate",
		"dtmf_type",
		"outside_call",
		"webitel_direction",
		"RFC2822_DATE",
		"timezone",
		"domain_name",
		"force_transfer_context",
		"presence_data",
		"local_media_ip",
		"local_media_port",
		"advertised_media_ip",
		"rtp_use_timer_name",
		"rtp_use_pt",
		"rtp_use_ssrc",
		"rtp_2833_send_payload",
		"rtp_2833_recv_payload",
		"remote_media_ip",
		"remote_media_port",
		"originated_legs",
		"zrtp_secure_media_confirmed_audio",
		"zrtp_sas1_string_audio",
		"rtp_local_sdp_str",
		"endpoint_disposition",
		"sip_to_tag",
		"sip_from_tag",
		"sip_cseq",
		"sip_call_id",
		"sip_full_via",
		"sip_from_display",
		"sip_full_from",
		"sip_full_to",
		"max_forwards",
		"transfer_history",
		"transfer_source",
		"call_uuid",
		"socket_host",
		"sound_prefix",
		"dialed_extension",
		"export_vars",
		"ringback",
		"transfer_ringback",
		"hangup_after_bridge",
		"continue_on_fail",
		"webitel_record_file_name",
		"RECORD_MIN_SEC",
		"RECORD_STEREO",
		"RECORD_BRIDGE_REQ",
		"recording_follow_transfer",
		"record_post_process_exec_api",
		"dialed_user",
		"dialed_domain",
		"read_codec",
		"read_rate",
		"originate_causes",
		"originate_disposition",
		"DIALSTATUS",
		"last_bridge_to",
		"bridge_channel",
		"bridge_uuid",
		"signal_bond",
		"last_sent_callee_id_name",
		"last_sent_callee_id_number",
		"switch_m_sdp",
		"current_application_data",
		"current_application",
		"sip_hangup_phrase",
		"last_bridge_hangup_cause",
		"last_bridge_proto_specific_hangup_cause",
		"last_bridge_role",
		"playback_last_offset_pos",
		"playback_seconds",
		"playback_ms",
		"playback_samples",
		"current_application_response",
		"bridge_hangup_cause",
		"record_samples",
		"record_seconds",
		"record_ms",
		"record_completion_cause",
		"hangup_cause",
		"hangup_cause_q850",
		"digits_dialed",
		"start_stamp",
		"profile_start_stamp",
		"answer_stamp",
		"bridge_stamp",
		"progress_stamp",
		"progress_media_stamp",
		"end_stamp",
		"start_epoch",
		"start_uepoch",
		"profile_start_epoch",
		"profile_start_uepoch",
		"answer_epoch",
		"answer_uepoch",
		"bridge_epoch",
		"bridge_uepoch",
		"last_hold_epoch",
		"last_hold_uepoch",
		"hold_accum_seconds",
		"hold_accum_usec",
		"hold_accum_ms",
		"resurrect_epoch",
		"resurrect_uepoch",
		"progress_epoch",
		"progress_uepoch",
		"progress_media_epoch",
		"progress_media_uepoch",
		"end_epoch",
		"end_uepoch",
		"last_app",
		"last_arg",
		"caller_id",
		"duration",
		"billsec",
		"progresssec",
		"answersec",
		"waitsec",
		"progress_mediasec",
		"flow_billsec",
		"mduration",
		"billmsec",
		"progressmsec",
		"answermsec",
		"waitmsec",
		"progress_mediamsec",
		"flow_billmsec",
		"uduration",
		"billusec",
		"progressusec",
		"answerusec",
		"waitusec",
		"progress_mediausec",
		"flow_billusec",
		"sip_hangup_disposition",
		"rtp_audio_in_raw_bytes",
		"rtp_audio_in_media_bytes",
		"rtp_audio_in_packet_count",
		"rtp_audio_in_media_packet_count",
		"rtp_audio_in_skip_packet_count",
		"rtp_audio_in_jitter_packet_count",
		"rtp_audio_in_dtmf_packet_count",
		"rtp_audio_in_cng_packet_count",
		"rtp_audio_in_flush_packet_count",
		"rtp_audio_in_largest_jb_size",
		"rtp_audio_in_jitter_min_variance",
		"rtp_audio_in_jitter_max_variance",
		"rtp_audio_in_jitter_loss_rate",
		"rtp_audio_in_jitter_burst_rate",
		"rtp_audio_in_mean_interval",
		"rtp_audio_in_flaw_total",
		"rtp_audio_in_quality_percentage",
		"rtp_audio_in_mos",
		"rtp_audio_out_raw_bytes",
		"rtp_audio_out_media_bytes",
		"rtp_audio_out_packet_count",
		"rtp_audio_out_media_packet_count",
		"rtp_audio_out_skip_packet_count",
		"rtp_audio_out_dtmf_packet_count",
		"rtp_audio_out_cng_packet_count",
		"rtp_audio_rtcp_packet_count",
		"rtp_audio_rtcp_octet_count",
	}
	IgnoreBeginWith = [...]string{
		"verto_",
	}
)