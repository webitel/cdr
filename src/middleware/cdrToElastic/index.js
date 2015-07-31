/**
 * Created by i.n. on 15.06.2015.
 */

var conf = require('../../config'),
    elasticConf = conf.get('elastic'),
    elastic = require('./elastic')(elasticConf),
    log = require('../../libs/log')(module),
    _ = require('underscore'),
    async = require('async');

//var moment = require('moment');

elastic.indices.putTemplate({
        "name": "webitel",
        body: {
            "template" : "igor*",
            "mappings": {
                "collection": {
                    "dynamic_templates" : [
                        {
                            "string_fields" : {
                                "path_match" : "variables.*",
                                "mapping" : {
                                    "type" : "string",
                                    "index" : "not_analyzed"
                                }
                            }
                        },
                        {
                            "notanalyzed": {
                                "match":              "*",
                                "match_mapping_type": "string",
                                "mapping": {
                                    "type":        "string",
                                    "index":       "not_analyzed"
                                }
                            }
                        }
                    ],
                    "properties": {
                        "Call start time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss",
                            "index" : "not_analyzed"
                        },
                        "Call answer time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss",
                            "index" : "not_analyzed"
                        },
                        "Call direction": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Hangup cause": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "User ID": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Destination User": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Q.850 Hangup Code": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "Call duration in seconds": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "Call duration": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Connected call duration in seconds": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "Connected call duration": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Call end time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss",
                            "index" : "not_analyzed"
                        },
                        "Bridge time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss",
                            "index" : "not_analyzed"
                        },
                        "Progress time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss",
                            "index" : "not_analyzed"
                        },
                        "Agent ID": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Queue ID": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Destination number": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Call record in seconds": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "CallerID number": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Domain name": {
                            "type": "string",
                            "index" : "not_analyzed"
                        },
                        "Bridged": {
                            "type": "boolean",
                            "index" : "not_analyzed"
                        },
                        "PDD": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "Ring Duration": {
                            "type": "long",
                            "index" : "not_analyzed"
                        },
                        "callflow": {
                            "type": "nested",
                            "include_in_parent" : true,
                            "properties": {
                                "times": {
                                    "type": "object",
                                    "store" : "yes",
                                    "properties": {
                                        "created_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "profile_created_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "progress_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "progress_media_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "answered_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "bridged_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "last_hold_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "hold_accum_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "hangup_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "resurrect_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        },
                                        "transfer_time": {
                                            "store" : "yes",
                                            "type": "long"
                                        }
                                    }
                                },
                                "caller_profile": {
                                    "type": "object",
                                    "store" : "yes",
                                    "properties": {
                                        "username": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "dialplan": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "caller_id_name": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "ani": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "caller_id_number": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "network_addr": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "destination_number": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "uuid": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "context": {
                                            "store" : "yes",
                                            "type": "string"
                                        },
                                        "chan_name": {
                                            "store" : "yes",
                                            "type": "string"
                                        }
                                    }
                                },
                                "dialplan": {
                                    "type": "string"
                                }
                            }
                        },
                        "variables": {
                            "type": "object",
                            "properties": {
                                "start_stamp": {
                                    "type": "date",
                                    "format": "yyyy-MM-dd HH:mm:ss"
                                },
                                "answer_epoch": {
                                    "type": "long"
                                },
                                "answer_uepoch": {
                                    "type": "long"
                                },
                                "answermsec": {
                                    "type": "long"
                                },
                                "answersec": {
                                    "type": "long"
                                },
                                "answerusec": {
                                    "type": "long"
                                },
                                "billmsec": {
                                    "type": "long"
                                },
                                "billsec": {
                                    "type": "long"
                                },
                                "billusec": {
                                    "type": "long"
                                },
                                "bridge_epoch": {
                                    "type": "long"
                                },
                                "bridge_uepoch": {
                                    "type": "long"
                                },
                                "conference_member_id": {
                                    "type": "long"
                                },
                                "dialed_user": {
                                    "type": "long"
                                },
                                "duration": {
                                    "type": "long"
                                },
                                "end_epoch": {
                                    "type": "long"
                                },
                                "end_uepoch": {
                                    "type": "long"
                                },
                                "flow_billmsec": {
                                    "type": "long"
                                },
                                "flow_billsec": {
                                    "type": "long"
                                },
                                "flow_billusec": {
                                    "type": "long"
                                },
                                "hangup_cause_q850": {
                                    "type": "long"
                                },
                                "hold_accum_ms": {
                                    "type": "long"
                                },
                                "hold_accum_seconds": {
                                    "type": "long"
                                },
                                "hold_accum_usec": {
                                    "type": "long"
                                },
                                "last_hold_epoch": {
                                    "type": "long"
                                },
                                "last_hold_uepoch": {
                                    "type": "long"
                                },
                                "local_media_port": {
                                    "type": "long"
                                },
                                "local_video_port": {
                                    "type": "long"
                                },
                                "max_forwards": {
                                    "type": "long"
                                },
                                "mduration": {
                                    "type": "long"
                                },
                                "original_read_rate": {
                                    "type": "long"
                                },
                                "playback_ms": {
                                    "type": "long"
                                },
                                "playback_seconds": {
                                    "type": "long"
                                },
                                "profile_start_epoch": {
                                    "type": "long"
                                },
                                "profile_start_uepoch": {
                                    "type": "long"
                                },
                                "progress_epoch": {
                                    "type": "long"
                                },
                                "progress_media_epoch": {
                                    "type": "long"
                                },
                                "progress_media_uepoch": {
                                    "type": "long"
                                },
                                "progress_mediamsec": {
                                    "type": "long"
                                },
                                "progress_mediasec": {
                                    "type": "long"
                                },
                                "progress_mediausec": {
                                    "type": "long"
                                },
                                "progress_uepoch": {
                                    "type": "long"
                                },
                                "progressmsec": {
                                    "type": "long"
                                },
                                "progressusec": {
                                    "type": "long"
                                },
                                "read_rate": {
                                    "type": "long"
                                },
                                "record_ms": {
                                    "type": "long"
                                },
                                "record_seconds": {
                                    "type": "long"
                                },
                                "remote_media_port": {
                                    "type": "long"
                                },
                                "remote_video_port": {
                                    "type": "long"
                                },
                                "sip_invite_failure_status": {
                                    "type": "long"
                                },
                                "start_epoch": {
                                    "type": "long"
                                },
                                "start_uepoch": {
                                    "type": "long"
                                },
                                "uduration": {
                                    "type": "long"
                                },
                                "video_read_rate": {
                                    "type": "long"
                                },
                                "video_write_rate": {
                                    "type": "long"
                                },
                                "waitmsec": {
                                    "type": "long"
                                },
                                "waitsec": {
                                    "type": "long"
                                },
                                "waitusec": {
                                    "type": "long"
                                },
                                "write_rate": {
                                    "type": "long"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    function () {
        console.dir(arguments)
    });

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
        record["PDD"] = (callflow.times.progress_time > 0)
            ? (callflow.times.progress_time + callflow.times.progress_media_time) - callflow.times.created_time
            : 0; //
        record["Ring Duration"] = (callflow.times.answered_time === 0)
            ? callflow.times.hangup_time - callflow.times.created_time
            : callflow.times.answered_time - callflow.times.created_time;

    } catch (e) {
        log.error(e);
    } finally {
        return record
    };
};

function exportCollection(desc, mongoDb, callback) {

    var collection = mongoDb.collection(desc.name);
    var query = {};

    var indexName = desc.index + '-' + (new Date().toLocaleDateString()).replace(/-|\//g,'.');

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
            log.trace('----> find max start_stamp in index [' + indexName + ']');
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
                if (!result || !result['aggregations']) {
                    return next(new Error('Bad aggregatins.'))
                }
                query = {
                    "callflow.times.created_time": {
                        "$gt": (result['aggregations']['maxDate']['value'] + 1000) * 1000
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

                log.trace('----> find ' + total + ' documentents to export');
                next(null, total);
            });
        },

        function (total, next) {
            log.trace('----> streaming collection to elastic');

            var stream = collection
                .find(query)
                .stream();

            stream.on('data', function (doc) {
                stream.pause();
                if (desc.fields) {
                    doc = _.pick(doc, desc.fields);
                };
                elastic.create({
                    index: indexName + (doc.variables.domain_name ? '-' + doc.variables.domain_name : ''),
                    type: desc.type,
                    id: doc._id.toString(),
                    body: setCustomAttribute(doc)
                }, function (err) {
                    if (err) {
                        if (err['message'] && err['message'].indexOf('DocumentAlreadyExistsException') > -1) {
                            log.warn(err['message']);
                        } else {
                            log.error('failed to create document %s in elastic.', err['message']);
                            return next(err);
                        }
                    } else {
                        log.trace('Save document id %s', doc._id.toString());
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

var started = false;

module.exports = function (mongoDb) {
    if (started) return;
    // TODO ..
    started = true;
    var timeMSec = elasticConf.intervalMin * 60 * 1000;
    var timerId = setTimeout(function tick() {
        exportCollection(elasticConf.collections[0], mongoDb, function (err) {
            log.debug('Next sync with %s min', elasticConf.intervalMin);
            timerId = setTimeout(tick, timeMSec);
        });
        if (typeof gc === 'function')
            gc();

    }, 2000);
};