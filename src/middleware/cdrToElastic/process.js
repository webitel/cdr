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

    var currentDate = new Date();
    var indexName = desc.index + '-' + currentDate.getMonth() + '.' + currentDate.getFullYear();

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
                        log.debug('Save document id %s', doc._id.toString());
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

var mongoClient = new MongoClient();
mongoClient.connect(conf.get('cdrDB:uri') ,function(err, db) {
    if (err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };
    exportCollection(elasticConf.collections[0], db, function (err) {
        db.close();
        log.debug('Process exit 0.');
        process.exit(0);
    });
});