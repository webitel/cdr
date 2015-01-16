var MongoDb = require("mongodb")
    , MongoClient = MongoDb.MongoClient
    , format = require('util').format
    , config = require('../config')
    , collection = new Object()
    , dbCdr = new Object()
    , dbFile = new Object()
    , log = require('../libs/log')(module)
    , ObjectId = require('mongodb').ObjectID;


MongoClient.connect(config.get('db:uri') ,function(err, db) {
    if(err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };

    collection = dbCdr = db.collection(config.get("db:collectionCDR"));
    dbFile = db.collection(config.get("db:collectionFile"));
    log.info('Connected db %s ', config.get('db:uri'));
    db.on('close', function () {
        log.error('close mongo');
    })
});

module.exports.InsertFile = function (data, callback) {
    dbFile.save(data, {safe: true}, callback);
};

module.exports.GetRecordFile = function (uuid, callback) {
    dbFile.findOne({uuid: uuid}, callback);
//    dbFile.findAndModify(
//        { uuid: uuid }
//        ,null
//        ,{ $inc: { requestCount: 1 }}
//        ,null
//        , callback
//    )
};

module.exports.GetRecordFilesFromUuids = function (uuids, callback) {
    dbFile.find({
        uuid:{
            $in: uuids
        }
    }).toArray(callback);
};

var defColumns = {
    fields: {
        "variables.uuid": 1,
        "callflow.caller_profile.caller_id_name": 1,
        "callflow.caller_profile.caller_id_number": 1,
        "callflow.caller_profile.callee_id_number": 1,
        "callflow.caller_profile.callee_id_name": 1,
        "callflow.caller_profile.destination_number": 1,
        "callflow.times.created_time": 1,
        "callflow.times.answered_time": 1,
        "callflow.times.bridged_time": 1,
        "callflow.times.hangup_time": 1,
        "variables.duration": 1,
        "variables.hangup_cause": 1,
        "variables.billsec": 1,

        "variables.direction": 1
    }
}

var filterLegA = {
    "$or": [
        {
            "variables.originatee": {'$ne': null}
        },
        {
            "variables.origination": {'$ne': null}
        },
        {
            "variables.originate_disposition": {'$ne': null}
        }
    ]
};

function setFilterLegB (legAUuid) {
    return {
        "$or": [
            {
                "variables.originator": legAUuid
            },
            {
                "variables.originating_leg_uuid": legAUuid
            }
        ]
    }
}

function getLastIdSort(sort) {
    sort['_id'] = 1;
    return sort;
}

function buildFilterQuery(filter) {
    var filterArray = [];
    filterArray.push(filterLegA); // TODO
    if (filter) {
        for (var key in filter) {
            if (key == '_id' && ObjectId.isValid(filter[key])) {
                filter[key] = ObjectId(filter[key]);
                continue;
            }
            for (var item in filter[key]) {
                if (filter[key][item] == '_id' && ObjectId.isValid(filter[key])) {
                    filter[key][item] = ObjectId(filter[key]);
                }
            }
        }
        filterArray.push(filter)
    };

    var query = {
        "$and": filterArray
    };
    return query
};

module.exports.showLegAList = function (columns, filter, sort, limit, pageNumber, callback) {
    columns = columns || defColumns;
    sort = sort || {
        "callflow.times.created_time": -1
    };

    limit = Number(limit) || 40;

    // TODO
    var query = buildFilterQuery(filter);

    collection.find(query, columns)
        .sort(sort)
        .skip(pageNumber > 0 ? ((pageNumber - 1) * limit) : 0)
        .limit(limit)
        .toArray(function(err, results) {
            callback(err, results);
        });
};

module.exports.showLegBList = function (columns, filter, sort, legAUuid, callback) {
    columns = columns || defColumns;
    sort = sort || {};

    var filterArray = [];
    filterArray.push(setFilterLegB(legAUuid));
    if (filter) {
        for (var key in filter) {
            if (key == '_id') {
                filter[key] = ObjectId(filter[key]);
                continue;
            }
            for (var item in filter[key]) {
                if (filter[key][item] == '_id') {
                    filter[key][item] = ObjectId(filter[key]);
                }
            }
        }
        filterArray.push(filter)
    }

    var query = {
        "$and": filterArray
    };
    log.info('filter: ' + JSON.stringify(query) + '\n sort: ' + JSON.stringify(getLastIdSort(sort)));
    collection.find(query, columns)
        .sort(getLastIdSort(sort))
        .toArray(function(err, results) {
            callback(err, results);
        });
}

module.exports.showLegACount = function (filter, callback) {

    // TODO
    var query = buildFilterQuery(filter);

    collection.find(query).count(function(err, results) {
            callback(err, results);
        });
};

module.exports.aggregate = function (aggr, domain, callback) {
    try {
        aggr.unshift({
            "$match": filterLegA
        });
        collection.aggregate(aggr, function (err, result) {
            callback(err, result);
        })
    } catch (e) {
        callback(500);
    }

}

