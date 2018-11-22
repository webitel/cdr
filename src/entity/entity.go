package entity

import (
	"fmt"
)

type SqlCdrRepository interface {
	InsertPack(calls []SqlCdr) error
	SelectPackByState(count uint32, state uint8, option string) ([]*SqlCdr, error)
	UpdateState(calls []*SqlCdr, state uint8, option string) error
	DeleteFromQueue(calls []*SqlCdr, option string) error
	InsertIntoQueue(calls []SqlCdr, option string) error
	CreateTableIfNotExist() error
	CreateQueueTableIfNotExist(option string) error
}

type SqlCdrARepository SqlCdrRepository
type SqlCdrBRepository SqlCdrRepository

type ElasticCdrRepository interface {
	InsertDocs(calls []*ElasticCdr) (error, []*SqlCdr, []*SqlCdr)
}

type ElasticCdrARepository ElasticCdrRepository
type ElasticCdrBRepository ElasticCdrRepository

type ElasticAccountsRepository interface {
	InsertDocs(calls []Account) (error, []Account, []Account)
}

type AmqPublisherRepository interface {
	CreateAmqConnection(connectionString, exchangeName, exchangeType string)
	GetMessages(exchName, exchType, routingKey string) (<-chan Delivery, error)
	InitExchange(exchName, exchType string) error
}

type AmqReceiverRepository interface {
	CreateAmqConnection(connectionString, exchangeName, exchangeType string)
	SendMessage(calls []*SqlCdr, routingKey, exchName string) error
	InitExchange(exchName, exchType string) error
}

// Delivery implementes a single message delivery.
type Delivery interface {
	Ack(multiple bool) error
	Nack(multiple, requeue bool) error
	GetBody() []byte
}

type AmqError struct {
	Code   int    // constant code from the specification
	Reason string // description of the error
	// Server  bool   // true when initiated from the server, false when from this library
	// Recover bool   // true when this error can be recovered by retrying later or with different parameters
}

func (e AmqError) Error() string {
	return fmt.Sprintf("Exception (%d) Reason: %q", e.Code, e.Reason)
}

type SqlCdr struct {
	Id          uint64
	Uuid        string
	Parent_uuid string
	Created_at  uint64
	Size        uint32
	Event       []byte
	State       uint8
}

type ElasticCdr struct {
	Leg                  string `json:"leg,omitempty"`
	Parent_uuid          string `json:"parent_uuid,omitempty"`
	Uuid                 string `json:"uuid"`
	Direction            string `json:"direction,omitempty"`
	CallerIdName         string `json:"caller_id_name,omitempty"`
	CallerIdNumber       string `json:"caller_id_number,omitempty"`
	NetworkAddr          string `json:"network_addr,omitempty"`
	DestinationNumber    string `json:"destination_number,omitempty"`
	DomainName           string `json:"domain_name,omitempty"`
	Extension            string `json:"extension,omitempty"`
	PresenceId           string `json:"presence_id,omitempty"`
	Source               string `json:"source,omitempty"`
	Gateway              string `json:"gateway,omitempty"`
	Q850HangupCode       uint32 `json:"hangup_cause_q850"`
	HangupCause          string `json:"hangup_cause,omitempty"`
	HangupDisposition    string `json:"hangup_disposition,omitempty"`
	OriginateDisposition string `json:"originate_disposition,omitempty"`
	TransferDisposition  string `json:"transfer_disposition,omitempty"`
	CallCreatedTime      uint64 `json:"created_time,omitempty"`
	//times
	// BridgedTime     uint64 `json:"bridged_time,omitempty"`
	// CallAnswerTime  uint64 `json:"answered_time,omitempty"`
	// ProgressTime    uint64 `json:"progress_time,omitempty"`
	// CallHangupTime  uint64 `json:"hangup_time,omitempty"`
	//TransferTime    uint64 `json:"transfer_time,omitempty"`
	///////
	Duration              uint32 `json:"duration"`
	ConnectedCallDuration uint32 `json:"billsec"`
	ProgressSeconds       uint32 `json:"progresssec"`
	AnswerSeconds         uint32 `json:"answersec"`
	WaitSeconds           uint32 `json:"waitsec"`
	HoldAccumSeconds      uint32 `json:"holdsec"`
	HoldSecB              uint32 `json:"holdsec_b,omitempty"`
	TalkSec               uint32 `json:"talksec,omitempty"`
	///////
	QualityPercentageAudio uint32                 `json:"quality_percentage_audio,omitempty"`
	QualityPercentageVideo uint32                 `json:"quality_percentage_video,omitempty"`
	Variables              map[string]interface{} `json:"variables"`
	*Locations             `json:"locations,omitempty"`
	*Queue                 `json:"queue,omitempty"`
	Callflow               *[]Callflow `json:"callflow,omitempty"`
}

type Callflow struct {
	CallerProfile `json:"caller_profile,omitempty"`
	Times         `json:"times,omitempty"`
}

type CallerProfile struct {
	Username          string `json:"username,omitempty"`
	CallerIdName      string `json:"caller_id_name,omitempty"`
	Ani               string `json:"ani,omitempty"`
	Aniii             string `json:"aniii,omitempty"`
	CallerIdNumber    string `json:"caller_id_number,omitempty"`
	NetworkAddr       string `json:"network_addr,omitempty"`
	Rdnis             string `json:"rdnis,omitempty"`
	DestinationNumber string `json:"destination_number,omitempty"`
	Uuid              string `json:"uuid,omitempty"`
	Source            string `json:"source,omitempty"`
}

type Times struct {
	CreatedTime        uint64 `json:"created_time,omitempty"`
	ProfileCreatedTime uint64 `json:"profile_created_time,omitempty"`
	ProgressTime       uint64 `json:"progress_time,omitempty"`
	ProgressMediaTime  uint64 `json:"progress_media_time,omitempty"`
	AnsweredTime       uint64 `json:"answered_time,omitempty"`
	BridgedTime        uint64 `json:"bridged_time,omitempty"`
	LastHoldTime       uint64 `json:"last_hold_time,omitempty"`
	HoldAccumTime      uint64 `json:"hold_accum_time,omitempty"`
	HangupTime         uint64 `json:"hangup_time,omitempty"`
	ResurrectTime      uint64 `json:"resurrect_time,omitempty"`
	TransferTime       uint64 `json:"transfer_time,omitempty"`
}

type Locations struct {
	Geo         string `json:"geo,omitempty"`
	City        string `json:"city,omitempty"`
	Country     string `json:"country,omitempty"`
	CountryCode string `json:"country_code,omitempty"`
	Type        string `json:"type,omitempty"`
}

type Queue struct {
	CC_Queue_Name          string `json:"name,omitempty"`
	Queue_CallDuration     uint32 `json:"duration,omitempty"`
	Queue_WaitingDuration  uint32 `json:"wait_duration,omitempty"`
	CC_CancelReason        string `json:"cancel_reason,omitempty"`
	CC_Cause               string `json:"cause,omitempty"`
	CC_Queue_AnsweredEpoch uint64 `json:"answered_time,omitempty"`
	CC_Queue_Hangup        uint64 `json:"exit_time,omitempty"`
	CC_Queue_JoinedEpoch   uint64 `json:"joined_time,omitempty"`
	CC_Side                string `json:"side,omitempty"`
}

type Account struct {
	Uuid          string  `json:"-"`
	PresenceId    string  `json:"presence_id,omitempty"`
	Domain        string  `json:"domain,omitempty"`
	Extension     string  `json:"extension,omitempty"`
	Account       string  `json:"account,omitempty"`
	DisplayStatus string  `json:"display_status,omitempty"`
	Status        string  `json:"status,omitempty"`
	State         string  `json:"state,omitempty"`
	Description   string  `json:"description,omitempty"`
	Online        bool    `json:"ws"`
	CallCenter    bool    `json:"cc"`
	CreatedTime   float64 `json:"created_time,omitempty"`
	EndTime       float64 `json:"end_time,omitempty"`
	Duration      float64 `json:"duration,omitempty"`
}

var (
	IgnoredList = [...]string{
		"presence_id",
		"rtp_use_codec_string",
		"rtp_has_crypto",
		"media_webrtc",
		"event_channel_cookie",
		"jsock_uuid_str",
		"ignore_early_media",
		"send_silence_when_idle",
		"record_post_process_exec_app",
		"Core-UUID",
		"Event-Calling-File",
		"Event-Calling-Function",
		"Event-Calling-Line-Number",
		"Event-Date-GMT",
		"Event-Date-Local",
		"Event-Date-Timestamp",
		"Event-Name",
		"Event-Sequence",
		"FreeSWITCH-Hostname",
		"FreeSWITCH-IPv4",
		"FreeSWITCH-IPv6",
		"FreeSWITCH-Switchname",
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
		"signal_bond",
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
