/**
 * Created by igor on 01.08.16.
 */

"use strict";

const log = require('../libs/log')(module);

const DELETE_CDR_VARIABLES_FIELDS = ['Event-Date-Timestamp', 'answer_epoch', 'answer_uepoch', 'bridge_epoch', 'bridge_uepoch',
    'end_epoch', 'end_uepoch', 'profile_start_epoch', 'profile_start_uepoch', 'progress_media_epoch', 'progress_media_uepoch',
    'progress_uepoch', 'ep_codec_string', 'rtp_local_sdp_str', 'rtp_use_codec_string', 'sip_full_via', 'switch_m_sdp',
    'switch_r_sdp', 'DP_MATCH', 'Event-Calling-File', 'Event-Calling-Function', '.Event-Calling-Line-Number',
    'Event-Date-GMT', 'user_context','FreeSWITCH-IPv4', 'FreeSWITCH-IPv6', 'FreeSWITCH-Switchname', 'advertised_media_ip',
    'answermsec', 'answerusec', 'audio_media_flow', 'billmsec', 'billusec', 'bridge_channel', 'channel_name', 'current_application',
    'current_application_data', 'dtmf_type', 'export_vars', 'flow_billmsec', 'flow_billusec', 'hold_accum_ms', 'hold_accum_usec',
    'last_app', 'last_arg', 'last_hold_epoch', 'last_hold_uepoch', 'local_media_ip', 'local_media_port', 'max_forwards',
    'mduration', 'progress_mediamsec', 'progress_mediausec', 'progressmsec', 'progressusec', 'record_post_process_exec_api',
    'record_ms', 'record_completion_cause', 'recording_follow_transfer', 'recovery_profile_name', 'remote_audio_ip',
    'remote_audio_ip_reported', 'remote_audio_port', 'remote_audio_port_reported', 'remote_media_ip', 'remote_media_port',
    'rtp_2833_recv_payload', 'rtp_2833_send_payload', 'resurrect_uepoch', 'resurrect_epoch', 'rtp_audio_in_cng_packet_count',
    'rtp_audio_in_dtmf_packet_count', 'rtp_audio_in_flaw_total', 'rtp_audio_in_flush_packet_count', 'rtp_audio_in_jitter_burst_rate',
    'rtp_audio_in_jitter_loss_rate', 'rtp_audio_in_jitter_max_variance', 'rtp_audio_in_jitter_min_variance', 'rtp_audio_in_jitter_packet_count',
    'rtp_audio_in_largest_jb_size', 'rtp_audio_in_mean_interval', 'rtp_audio_in_media_bytes', 'rtp_audio_in_media_packet_count',
    'rtp_audio_in_mos', 'rtp_audio_in_packet_count', 'rtp_audio_in_quality_percentage', 'rtp_audio_in_raw_bytes',
    'rtp_audio_in_skip_packet_count', 'rtp_audio_out_cng_packet_count', 'rtp_audio_out_dtmf_packet_count',
    'rtp_audio_out_media_bytes', 'rtp_audio_out_media_packet_count', 'rtp_audio_out_packet_count', 'rtp_audio_out_raw_bytes',
    'rtp_audio_out_skip_packet_count', 'rtp_audio_recv_pt', 'rtp_audio_rtcp_octet_count', 'rtp_audio_rtcp_packet_count',
    'rtp_auto_adjust_audio', 'sip_local_network_addr', 'sip_full_to', 'sip_full_from', 'sip_from_user_stripped',
    'sip_from_uri', 'sip_from_tag', 'sip_from_host', 'sip_network_ip', 'sip_network_port', 'sip_nat_detected',
    'sip_to_tag', 'sip_via_host', 'sip_via_port', 'sip_via_rport', 'socket_host', 'sound_prefix', 'sofia_profile_name', 'verto_profile_name',
    'sip_from_port', 'sip_received_ip', 'sip_received_port', 'Event-Name', 'Core-UUID', 'FreeSWITCH-Hostname', 'Event-Date-Local', 'Event-Calling-Line-Number',
    'Event-Sequence', 'sip_number_alias', 'sip_auth_username', 'sip_auth_realm', 'sip_req_user', 'sip_req_port', 'sip_req_uri',
    'sip_req_host', 'sip_to_user', 'sip_to_port', 'sip_to_uri', 'sip_to_host', 'sip_contact_params', 'sip_contact_user', 'sip_contact_port',
    'sip_contact_uri', 'sip_contact_host', 'rtp_last_audio_codec_string', 'video_possible', 'rtp_video_fmtp', 'rtp_video_pt', 'rtp_video_recv_pt',
    'rtp_last_video_codec_string', 'rtp_use_ssrc', 'rtp_use_pt', 'rtp_use_ssrc', 'local_video_ip', 'local_video_port', 'rtp_use_video_pt',
    'rtp_use_video_ssrc', 'sip_cseq', 'sip_call_id', 'start_epoch', 'start_uepoch', 'uduration', 'waitusec',
    'rtp_video_in_raw_bytes', 'rtp_video_in_media_bytes', 'rtp_video_in_packet_count', 'rtp_video_in_media_packet_count',
    'rtp_video_in_skip_packet_count', 'rtp_video_in_jitter_packet_count', 'rtp_video_in_dtmf_packet_count', 'rtp_video_in_cng_packet_count',
    'rtp_video_in_flush_packet_count', 'rtp_video_in_largest_jb_size', 'rtp_video_in_jitter_min_variance', 'rtp_video_in_jitter_max_variance',
    'rtp_video_in_jitter_loss_rate', 'rtp_video_in_jitter_burst_rate', 'rtp_video_in_mean_interval', 'rtp_video_in_flaw_total',
    'rtp_video_in_quality_percentage', 'rtp_video_in_mos', 'rtp_video_out_raw_bytes', 'rtp_video_out_media_bytes',
    'rtp_video_out_packet_count', 'rtp_video_out_media_packet_count', 'rtp_video_out_skip_packet_count', 'rtp_video_out_dtmf_packet_count',
    'rtp_video_out_cng_packet_count', 'rtp_video_rtcp_packet_count', 'rtp_video_rtcp_octet_count', 'RFC2822_DATE', 'remote_video_ip',
    'remote_video_port', 'rtp_use_video_codec_fmtp', 'rtp_use_timer_name', 'rtp_use_video_codec_ptime', 'progress_epoch', 'waitmsec',
    'originate_causes', 'originated_legs', 'session_id'
];

module.exports = {
    setCustomAttribute: (record) => {
        try {
            var callflow = record.callflow && record.callflow[0] || {
                    "caller_profile": {},
                    "extension": {},
                    "times": {}
                };
            //console.log(('' + record.variables.duration).toHHMMSS());
            //console.log(('' + record.variables.billsec).toHHMMSS());

            record["Call start time"] = record.variables.start_stamp; // +
            record["Call answer time"] = record.variables.answer_stamp; // +
            record["Answered"] = +record.variables.answer_epoch > 0; // +
            record["Call direction"] = record.variables.webitel_direction; // +
            record["Hangup cause"] = record.variables.hangup_cause; // +
            record["Q850 Hangup Code"] = record.variables.hangup_cause_q850; // +
            record["Call duration"] = record.variables.duration; // +
            //record["Call duration"] = ('' + record.variables.duration).toHHMMSS(); // +- todo
            record["Connected call duration"] = record.variables.billsec; // +
            //record["Connected call duration"] = ('' + record.variables.billsec).toHHMMSS(); // +- todo
            record["Call end time"] = record.variables.end_stamp; // +
            if (record.variables.bridge_epoch > 0)
                record["Bridge time"] = record.variables.bridge_epoch * 1000; // +

            record["Progress time"] = record.variables.progress_stamp; // +
            //record["Dialed User"] = record.variables.dialed_user; // +
            //record["Dialed Domain name"] = record.variables.dialed_domain; // +
            record["Agent ID"] = record.variables.cc_agent  && ('' + record.variables.cc_agent).split('@')[0]; // +
            record["Queue ID"] = record.variables.cc_queue && ('' + record.variables.cc_queue).split('@')[0]; // +
            record["Queue stop cause"] = record.variables.cc_cause; // +
            record["Queue cancel reason"] = record.variables.cc_cancel_reason; // +
            record["Queue stop side"] = record.variables.cc_side; // +

            if (record.variables.cc_queue_joined_epoch)
                record["Queue start time"] = record.variables.cc_queue_joined_epoch * 1000; // +

            if (record.variables.cc_queue_answered_epoch)
                record["Queue answer time"] = record.variables.cc_queue_answered_epoch * 1000; // +

            let _queueStopTime = record.variables.cc_queue_canceled_epoch || record.variables.cc_queue_terminated_epoch;
            if (_queueStopTime > 0)
                record["Queue stop time"] =  _queueStopTime * 1000;

            record["Queue Answer Delay"] = record.variables.cc_queue_answered_epoch
                ? record.variables.cc_queue_answered_epoch - record.variables.cc_queue_joined_epoch
                : 0; // +

            record["Queue call duration"] = (record.variables.cc_queue_canceled_epoch || record.variables.cc_queue_terminated_epoch)
                - record.variables.cc_queue_joined_epoch;

            record["Queue connected call duration"] = record.variables.cc_queue_answered_epoch
                ? record.variables.cc_queue_terminated_epoch - record.variables.cc_queue_answered_epoch
                : 0; // +

            record["Queue Answered"] = record.variables.cc_queue_answered_epoch > 0; // +

            record["Destination number"] = callflow.caller_profile.destination_number; // +
            record["Call record duration"] = record.variables.record_seconds; // +
            record["CallerID number"] = callflow.caller_profile.caller_id_number; // +
            record["Domain name"] = record.variables.domain_name; // +
            record["User ID"] = record.variables.presence_id && ('' + record.variables.presence_id).split('@')[0]; // +
            record["Destination User"] = record.variables.dialed_user && ('' + record.variables.dialed_user).split('@')[0]; // +

            record["Bridged"] = record.variables.bridge_epoch > 0;

            record["Ring Duration"] = (record.variables['answer_epoch'] > 0)
                ? record.variables['answer_epoch'] - record.variables['start_epoch']
                : record.variables['end_epoch'] - record.variables['start_epoch']
            ;

            record["Before Bridge Delay"] = (record.variables.bridge_epoch > 0)
                ? record.variables.bridge_epoch - record.variables.start_epoch
                : 0
            ;

            record["Post Dialing Delay"] = (record.variables['progress_epoch'] > 0)
                ? record.variables['progress_epoch'] - record.variables['start_epoch']
                : (record.variables['progress_media_epoch'] > 0)
                ? record.variables['progress_media_epoch'] - record.variables['start_epoch']
                : (record.variables['answer_epoch'] > 0)
                ? record.variables['answer_epoch'] - record.variables['start_epoch']
                : record.variables['end_epoch'] - record.variables['start_epoch']
            ;

            record["Location"] = record.variables.webitel_location;

            DELETE_CDR_VARIABLES_FIELDS.forEach(function (delName) {
                if (record.variables.hasOwnProperty(delName))
                    delete record['variables'][delName];
            });

            delete record.callflow;
            delete record.app_log;
            delete record.channel_data;
            delete record.hold_record;
            delete record._version;
            delete record._ttl;
            delete record.callStats;

            record["CreatedOnStorage"] = record._id.getTimestamp().getTime();

        } catch (e) {
            log.error(e);
        } finally {
            return record
        }
    }
};