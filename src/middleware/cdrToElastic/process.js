/**
 * Created by Igor Navrotskyj on 17.08.2015.
 */

'use strict';

var conf = require('../../config'),
    elasticConf = conf.get('elastic'),
    elastic = require('./elastic')(elasticConf),
    log = require('../../libs/log')(module),
    _ = require('underscore'),
    MongoDb = require("mongodb"),
    ObjectId = require('mongodb').ObjectId,
    MongoClient = MongoDb.MongoClient,
    async = require('async');

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours + ':' + minutes + ':' + seconds;
    return time;
};

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

function setCustomAttribute (record) {
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

        record["CreatedOnStorage"] = record._id.getTimestamp().getTime();

    } catch (e) {
        log.error(e);
    } finally {
        return record
    };
};

function exportCollectionCdr(desc, mongoDb, callback) {

    var collection = mongoDb.collection(desc.name);
    var query = {
        "variables.loopback_leg": {$ne: "A"},
        "variables.webitel_direction": {$ne: "dialer"}
    };

    var currentDate = new Date();
    var indexName = desc.index + '-' + (currentDate.getMonth() + 1) + '.' + currentDate.getFullYear();

    if (!collection) {
        return callback('collection ' + desc.name + ' does not exist.');
    };

    log.trace(('====> exporting collection [' + desc.name + ']'));

    async.waterfall([
        function (next) {
            log.trace('----> checking connection to elastic');
            elastic.ping({requestTimeout: 10000}, function (err) {
                next(err);
            });
        },

        function (next) {
            log.trace('----> find max start_stamp in index [' + desc.index + '-*' + ']');
            elastic.search({
                index: desc.index + '-*',
                size: 1,
                body: {
                    "filter" : {
                        "match_all" : { }
                    },
                    "sort": [
                        {
                            "CreatedOnStorage": {
                                "order": "desc"
                            }
                        }
                    ],
                    "size": 1
                }
            }, function (err, result) {
                if (err) return next(err);
                if (!result) {
                    return next(new Error('Bad aggregatins.'))
                }
                var startExportDate;

                if (result && result.hits && result.hits.hits && result.hits.hits.length > 0) {
                    startExportDate = new ObjectId(result.hits.hits[0]._id);
                    query._id = {
                        "$gte": startExportDate
                    }
                } else {
                    startExportDate = new ObjectId.createFromTime(1);
                }
                log.debug('Max startExportDate: %s', startExportDate.toString());

                next();
            });
        },

        function (next) {
            log.trace('----> analizing collection [' + desc.name + ']');
            collection.count(query, function (err, total) {
                if (err) {
                    return next(err);
                }

                log.trace('----> find ' + total + ' documents to export');
                next(null, total);
            });
        },

        function (total, next) {
            if (total === 0)
                return next();
            log.trace('----> streaming collection to elastic');

            var stream = collection
                .find(query)
                .sort({"_id": 1})
                //.batchSize(10000)
                .stream(),
                _total = total,
                countCreate = 0,
                onDataCount = 0,
                onCreateCbCount = 0;

            stream.on('data', function (doc) {
                onDataCount++;
                if (--_total < 0)
                    total++;
                ;

                var _record = setCustomAttribute(doc);
                delete _record.callflow;
                delete _record.app_log;
                delete _record.channel_data;
                delete _record.hold_record;
                delete _record._version;
                delete _record._ttl;
                var _id = _record._id.toString();
                delete _record._id;
                //console.dir(_record);
                elastic.create({
                    index: (indexName + (doc.variables.domain_name ? '-' + doc.variables.domain_name : '')).toLowerCase(),
                    type: desc.type,
                    id: _id,
                    body: _record
                }, function (err) {
                    onCreateCbCount++;
                    if (err) {
                        if (err['message'] && err['message'].indexOf('document_already_exists_exception') > -1) {
                            //log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    };

                    countCreate++;
                    if ((total === onDataCount) && (total === onCreateCbCount)){
                        if ( (total - countCreate) !== 0){
                            log.error('ERROR IMPORT TOTAL %s Created %s', total, countCreate);
                        } else {
                            log.debug('Created %s documents', countCreate)
                        };
                        log.debug("onCreateCbCount: %s; onDataCount: %s", onCreateCbCount, onDataCount);
                        return next(null, total);
                    };
                    stream.resume();
                });

                stream.pause();
            });
        },

    ], function (err) {
        if (err) {
            log.error(('====> collection [' + desc.name + '] - failed to export.'));
            log.error(err);
            return callback(err);
        }
        log.trace(('====> collection [' + desc.name + '] - end to export.'));
        callback(null);
    });
};

function setUserDescription(data) {
    if (!data['description']) {
        data['description'] = data['state'] + '/' + data['status']
    }
    return data;
};

function exportUsersStatus(desc, mongoDb, cb) {
    var COLLECTION_NAME = desc.name;
    var TYPE_MAPPING = desc.type;

    var collection = mongoDb.collection(COLLECTION_NAME);
    var currentDate = new Date();
    var indexName = desc.index + '-' + (currentDate.getMonth() + 1) + '.' + currentDate.getFullYear();

    var query = {"endDate": {"$exists": 1}, "account": {"$exists": 1}};
    log.trace(('====> exporting collection [' + desc.name + ']'));
    async.waterfall([
        function (next) {
            log.trace('----> checking connection to elastic');
            elastic.ping({requestTimeout: 10000}, function (err) {
                next(err);
            });
        },

        function (next) {
            log.trace('----> find max date in index [' + desc.index + '-*' + ']');
            elastic.search({
                index: desc.index + '-*',
                size: 1,
                body: {
                    "aggs": {
                        "maxDate": {
                            "max": {
                                "field": "date"
                            }
                        }
                    }
                }
            }, function (err, result) {
                if (err) return next(err);
                if (!result) {
                    return next(new Error('Bad aggregations.'))
                };
                var startExportDate;
                if (result && !result['aggregations']) {
                    startExportDate = 0;
                } else {
                    startExportDate = (result['aggregations']['maxDate']['value'] || 0);
                };

                query['date'] = {
                    "$gt": startExportDate,
                    "$lte": Date.now() * 1000
                };
                next();
            });
        },

        function (next) {
            log.trace('----> analizing collection [' + COLLECTION_NAME + ']');
            collection.count(query, function (err, total) {
                if (err) {
                    return next(err);
                }

                log.trace('----> find ' + total + ' documents to export');
                next(null, total);
            });
        },

        function (total, next) {
            if (total === 0)
                return next();
            log.trace('----> streaming collection to elastic');

            var stream = collection
                .find(query)
                .sort({"date": 1})
                .stream(),
                _total = total,
                countCreate = 0,
                onDataCount = 0,
                onCreateCbCount = 0;

            stream.on('data', function (doc) {
                onDataCount++;
                if (--_total < 0)
                    total++;

                doc['duration'] = Math.round((doc['endDate'] - doc['date']) / 1000);
                var _id = doc._id.toString();
                delete doc._id;
                delete doc._version;
                delete doc._ttl;

                if (!doc['description']) {
                    doc['description'] = doc['state'] + '/' + doc['status']
                };

                elastic.create({
                    index: indexName + (doc.domain ? '-' + doc.domain  : ''),
                    type: TYPE_MAPPING,
                    id: _id,
                    body: doc
                }, function (err) {
                    if (err) {
                        if (err['message'] && err['message'].indexOf('DocumentAlreadyExistsException') > -1) {
                            log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    };
                    countCreate++;
                    if ((total === onDataCount) && (total === onCreateCbCount)){
                        if ( (total - countCreate) !== 0){
                            log.error('ERROR IMPORT TOTAL %s Created %s', total, countCreate);
                        } else {
                            log.debug('Created %s documents', countCreate)
                        };
                        log.debug("onCreateCbCount: %s; onDataCount: %s", onCreateCbCount, onDataCount);
                        return next(err, total);
                    };
                    stream.resume();
                });

                stream.pause();
            });

            stream.on('end', function (err) {
                stream.destroy();
                next(err, total);
            });
        },

    ], function (err) {
        if (err) {
            log.error(('====> collection [' + COLLECTION_NAME + '] - failed to export.'));
            log.error(err);
            return cb(err);
        }
        log.trace(('====> collection [' + COLLECTION_NAME + '] - end to export.'));
        cb(null);
    });
};

const FUNCTIONS = {
    exportCollectionCdr: exportCollectionCdr,
    exportUsersStatus: exportUsersStatus
};

var mongoClient = new MongoClient();
mongoClient.connect(conf.get('mongodb:uri') ,function(err, db) {
    if (err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };
    var tasks = [];

    db.on('close', () => {
        log.error('Close mongodb. process force stop');
        process.exit(0);
    });

    elasticConf.collections.forEach(function (item) {
        if (FUNCTIONS.hasOwnProperty(item['_fn'])) {
            tasks.push(function (cb) {
                FUNCTIONS[item['_fn']](item, db, cb);
            });
        } else {
            log.warn("Option _fn required.");
        };
    });


    async.waterfall(tasks, function (err) {
        if (err)
            log.error(err);

        setTimeout(() => {
            db.close();
            process.exit(0);
        }, 5000);
    });

    //exportCollectionCdr(elasticConf.collections[0], db, function (err) {
    //    db.close();
    //    log.debug('Process exit 0.');
    //    process.exit(0);
    //});
});