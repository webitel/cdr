/**
 * Created by Igor Navrotskyj on 17.08.2015.
 */

'use strict';

console.log('init process');

var conf = require('../../config'),
    elasticConf = conf.get('elastic'),
    elastic = require('./elastic')(elasticConf),
    log = require('../../libs/log')(module),
    setCustomAttribute = require('../../utils/cdr').setCustomAttribute,
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