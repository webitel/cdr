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
            log.trace('----> search existing index [' + indexName + ']');
            elastic.indices.stats({index: indexName}, function (err, result) {
                next(null, !err)
            });
        },

        function (existsIndex, next) {
            if (!existsIndex) {
                log.trace('----> creating new index [' + indexName + ']');
                elastic.indices.create({index: indexName}, function (err, result) {
                    next(err, true);
                });
            } else {
                log.trace('----> skip creating new index [' + indexName + ']');
                next(null, false);
            }
        },

        function (createdIndex, next) {
            if (createdIndex) {
                next();
                return
            };
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
            log.trace('----> initialize index mapping');

            if (!desc.mappings) {
                return next();
            }

            elastic.indices.putMapping({index: indexName, type: desc.type, body: desc.mappings}, function (err) {
                next(err);
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
                    index: indexName,
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