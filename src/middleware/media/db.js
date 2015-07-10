/**
 * Created by i.navrotskyj on 16.03.2015.
 */
var db = require('../../libs/mongoDrv'),
    conf = require('../../config'),
    ObjectID = require('mongodb').ObjectID,
    COLLECTION_NAME = conf.get('mediaFile:collectionMedia');

var dbFile = {
    insert: function (data, callback) {
        var dbFile = db.getCollection(COLLECTION_NAME);
        dbFile.insert(data, callback);
    },

    searches: function (option, callback) {
        var dbFile = db.getCollection(COLLECTION_NAME);

        var columns = option['columns'] || {};
        var filter = option['filter'] || {};
        var limit = option['limit'];
        var pageNumber = option['pageNumber'] || 0;
        var sort = option['sort'] || {};
        var domain = option['domain'] || '';
        var query = buildFilterQuery(filter);

        limit = Number(limit) || 40;

        if (domain && typeof domain == "string")
            query['$and'].push({
                "$or": [
                    {
                        "domain": domain
                    },
                    {
                        "type": "local"
                    }
                ]
            });

        dbFile.find(query, columns)
            .sort(sort)
            .skip(pageNumber > 0 ? ((pageNumber - 1) * limit) : 0)
            .limit(limit)
            .toArray(function(err, results) {
                if (typeof callback == "function")
                    callback(err, results);
            });
    },

    get: function (query, option, callback) {
        var dbFile = db.getCollection(COLLECTION_NAME);

        if (option && option['limit'] && option['page']) {
            dbFile.find(query)
                .skip(option['page'] > 0 ? ((option['page'] - 1) * option['limit']) : 0)
                .limit(option['limit'])
                .toArray(function(err, results) {
                    if (typeof callback == "function")
                        callback(err, results);
                });
        } else {
            dbFile.find(query)
                .toArray(function(err, results) {
                    if (typeof callback == "function")
                        callback(err, results);
                });
        };
    },

    getOne: function (id, domain, type, cb) {
        try {
            var dbFile = db.getCollection(COLLECTION_NAME);
            dbFile.findOne({
                "name": id,
                "domain": domain,
                "type": type
            }, cb);
        } catch (e) {
            cb(e);
        };
    },

    remove: function (_id, callback) {
        var dbFile = db.getCollection(COLLECTION_NAME);
        try {
            dbFile.remove({_id: _id}, callback);
        } catch (e) {
            callback(e);
        };
    },

    deleteFromName: function (name, domain, type, cb) {
        var dbFile = db.getCollection(COLLECTION_NAME);
        try {
            dbFile.remove({
                "name": name,
                "domain": domain,
                "type": type
            }, cb);
        } catch (e) {
            cb(e);
        };
    },

    bulkOp: function () {
        return db.getCollection(COLLECTION_NAME).initializeUnorderedBulkOp();
    },
    
    update: function (query, param, cb) {
        if (query.hasOwnProperty('_id')) {
            query['_id'] = new ObjectID(query['_id']);
        };
        var dbFile = db.getCollection(COLLECTION_NAME);
        try {
            dbFile.findAndModify(query, {}, param, cb);
        } catch (e) {
            cb(e);
        };
    }
};

function buildFilterQuery(filter) {
    var filterArray = [];
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

module.exports = dbFile;