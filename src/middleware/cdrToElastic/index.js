/**
 * Created by i.n. on 15.06.2015.
 */

var conf = require('../../config'),
    elasticConf = conf.get('elastic'),
    elastic = require('./elastic')(elasticConf),
    log = require('../../libs/log')(module),
    async = require('async');

//var moment = require('moment');

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
                    next(err);
                });
            } else {
                log.trace('----> skip creating new index [' + indexName + ']');
                next();
            }
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
                elastic.create({
                    index: indexName,
                    type: desc.type,
                    id: doc._id.toString(),
                    body: {
                        "_id": doc._id.toString(),
                        "variables": doc.variables,
                        "callflow": doc.callflow
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