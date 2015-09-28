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
        record["Call direction"] = record.variables.webitel_direction; // +
        record["Hangup cause"] = record.variables.hangup_cause; // +
        record["Q.850 Hangup Code"] = record.variables.hangup_cause_q850; // +
        record["Call duration in seconds"] = record.variables.duration; // +
        record["Call duration"] = ('' + record.variables.duration).toHHMMSS(); // +- todo
        record["Connected call duration in seconds"] = record.variables.billsec; // +
        record["Connected call duration"] = ('' + record.variables.billsec).toHHMMSS(); // +- todo
        record["Call end time"] = record.variables.end_stamp; // +
        record["Bridge time"] = record.variables.bridge_stamp; // +
        record["Progress time"] = record.variables.progress_stamp; // +
        //record["Dialed User"] = record.variables.dialed_user; // +
        //record["Dialed Domain name"] = record.variables.dialed_domain; // +
        record["Agent ID"] = record.variables.cc_agent  && ('' + record.variables.cc_agent).split('@')[0]; // +
        record["Queue ID"] = record.variables.cc_queue && ('' + record.variables.cc_queue).split('@')[0]; // +
        record["Destination number"] = callflow.caller_profile.destination_number; // +
        record["Call record in seconds"] = record.variables.record_seconds; // +
        record["CallerID number"] = callflow.caller_profile.caller_id_number; // +
        record["Domain name"] = record.variables.domain_name; // +
        record["User ID"] = record.variables.presence_id && ('' + record.variables.presence_id).split('@')[0]; // +
        record["Destination User"] = record.variables.dialed_user && ('' + record.variables.dialed_user).split('@')[0]; // +
        record["Bridged"] = record.variables.bridge_stamp ? true : false; // +
        //record["PDD"] = (callflow.times.progress_time > 0)
        //    ? (callflow.times.progress_time + callflow.times.progress_media_time) - callflow.times.created_time
        //    : 0; //
        //record["Ring Duration"] = (callflow.times.answered_time === 0)
        //    ? callflow.times.hangup_time - callflow.times.created_time
        //    : callflow.times.answered_time - callflow.times.created_time;

        record["Location"] = record.variables.webitel_location;

        DELETE_CDR_VARIABLES_FIELDS.forEach(function (delName) {
            if (record.variables.hasOwnProperty(delName))
                delete record['variables'][delName];
        });
    } catch (e) {
        log.error(e);
    } finally {
        return record
    };
};

function exportCollectionCdr(desc, mongoDb, callback) {

    var collection = mongoDb.collection(desc.name);
    var query = {};

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
                    "aggs": {
                        "maxDate": {
                            "max": {
                                "field": "variables.start_stamp"
                            }
                        }
                    }
                }
            }, function (err, result) {
                if (err) return next(err);
                if (!result) {
                    return next(new Error('Bad aggregatins.'))
                };
                var startExportDate;
                if (result && !result['aggregations']) {
                    startExportDate = 0;
                } else {
                    startExportDate = (result['aggregations']['maxDate']['value'] + 1000) * 1000;
                };

                query = {
                    "callflow.times.created_time": {
                        "$gt": startExportDate
                    }
                };
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
                .sort({"callflow.times.created_time": 1})
                //.batchSize(10000)
                .stream();

            stream.on('data', function (doc) {
                stream.pause();
                var _record = setCustomAttribute(doc);
                if (desc.fields) {
                    //_record = _.pick(_record, desc.fields);
                };
                delete _record.callflow;
                delete _record.app_log;
                delete _record.channel_data;
                elastic.create({
                    index: indexName + (doc.variables.domain_name ? '-' + doc.variables.domain_name : ''),
                    type: desc.type,
                    id: doc._id.toString(),
                    body: _record
                }, function (err) {
                    if (err) {
                        if (err['message'] && err['message'].indexOf('DocumentAlreadyExistsException') > -1) {
                            log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    } else {
                        console.log('Save document id %s', doc._id.toString());
                    };
                    stream.resume();
                });
            });

            stream.on('end', function (err) {
                stream.destroy();
                next(err, total);
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

function exportGeo(mongoDb, cb) {
    const COLLECTION_NAME = 'location';
    const TYPE_MAPPING = 'geocollection';

    var collection = mongoDb.collection(COLLECTION_NAME);
    var indexName = 'mygeo2';
    var query = {"status": "OK", "version": 1};

    async.waterfall([
        function (next) {
            log.trace('----> checking connection to elastic');
            elastic.ping({requestTimeout: 10000}, function (err) {
                next(err);
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
                .stream();

            stream.on('data', function (doc) {
                stream.pause();
                if (!doc['goecode'][0]) {
                    return stream.resume();
                }


                elastic.create({
                    index: indexName + (doc.domain || ''),
                    type: TYPE_MAPPING,
                    id: doc._id.toString(),
                    //body: {
                    //    "Country": doc['Country'],
                    //    "Country Code": doc['Country Code'],
                    //    "Area": doc['Area'],
                    //    "Date": new Date().getTime(),
                    //    "Area Code": doc['Area Code'],
                    //    "location": {
                    //        "lat" : doc['qeocode']['results'][0]['geometry']['location'].lat,
                    //        "lon" : doc['qeocode']['results'][0]['geometry']['location'].lng
                    //    }
                    //}
                    body: {
                        "Country": doc['country'],
                        "Country Code": doc['code'],
                        "Area": doc['city'],
                        "Date": new Date().getTime(),
                        "location": doc['goecode'][0]['latitude'] + ',' + doc['goecode'][0]['longitude']
                    }
                }, function (err) {
                    if (err) {
                        if (err['message'] && err['message'].indexOf('DocumentAlreadyExistsException') > -1) {
                            log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    } else {
                        console.log('Save document id %s', doc._id.toString());
                    };
                    stream.resume();
                });
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

function exportUsersStatus(mongoDb, cb) {
    const COLLECTION_NAME = 'agentStatus';
    const TYPE_MAPPING = 'collectionagents';

    var collection = mongoDb.collection(COLLECTION_NAME);
    var indexName = 'agentsstatus-';
    var query = {};

    async.waterfall([
        function (next) {
            log.trace('----> checking connection to elastic');
            elastic.ping({requestTimeout: 10000}, function (err) {
                next(err);
            });
        },

        function (next) {
            log.trace('----> find max date in index [' + indexName + '-*' + ']');
            elastic.search({
                index: indexName + '*',
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
                    return next(new Error('Bad aggregatins.'))
                };
                var startExportDate;
                if (result && !result['aggregations']) {
                    startExportDate = 0;
                } else {
                    startExportDate = (result['aggregations']['maxDate']['value']);
                };

                query = {
                    "date": {
                        "$gt": startExportDate
                    }
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
                .stream();

            stream.on('data', function (doc) {
                stream.pause();

                elastic.create({
                    index: indexName + (doc.domain || ''),
                    type: TYPE_MAPPING,
                    id: doc._id.toString(),
                    body: doc
                }, function (err) {
                    if (err) {
                        if (err['message'] && err['message'].indexOf('DocumentAlreadyExistsException') > -1) {
                            log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    } else {
                        console.log('Save document id %s', doc._id.toString());
                    };
                    stream.resume();
                });
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

var mongoClient = new MongoClient();
mongoClient.connect(conf.get('cdrDB:uri') ,function(err, db) {
    if (err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };
    exportCollectionCdr(elasticConf.collections[0], db, function (err) {
        db.close();
        log.debug('Process exit 0.');
        process.exit(0);
    });
});