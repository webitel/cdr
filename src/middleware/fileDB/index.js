var db = require('../../libs/mongoDrv');

var dbFile = {
    insertFile: function (data, callback) {
        var dbFile = db.fileCollection;
        dbFile.save(data, {safe: true}, callback);
    },

    getRecordFile: function (uuid, callback) {
        var dbFile = db.fileCollection;
        var query;

        if (uuid instanceof Object) {
            query = uuid
        } else {
            query = {
                uuid: uuid
            }
        };
        dbFile
            .find(query)
            .toArray(callback);
    },

    getFilesStats: function (uuid, domain, option, callback) {
        var dbFile = db.fileCollection;
        var _q = {
                "$and": []
            },
            $and = [],
            _date = {

            };

        if (option['start']) {
            _date['$gte'] = option['start'];
        };

        if (option['end']) {
            _date['$lte'] = option['end'];
        };

        if (Object.keys(_date).length > 0) {
            $and.push({
                "createdOn": _date
            });
        };

        if (domain) {
            $and.push({
                "domain": domain
            });
        };
        _q['$and'] = $and;

        if (uuid) {
            _q['$and'].push({
                "uuid": uuid
            });

            dbFile.findOne(_q, {"size": 1, "_id": 0}, callback);
        } else {

            var aggr = [];
            if ($and.length > 0)
                aggr.push({
                    "$match": _q
                });

            aggr = aggr.concat(
                {"$group": { "_id": null, "size": {"$sum": "$size"}}},
                {"$project": {"_id": 0, "size": 1}}
            );

            dbFile.aggregate(aggr, callback);
        };
    },

    getRecordFilesFromUuids: function (uuids, callback) {
        var dbFile = db.fileCollection;
        dbFile.find({
            uuid:{
                $in: uuids
            }
        }).toArray(callback);
    },

    removeFileDB: function (_id, callback) {
        var dbFile = db.fileCollection;
        try {
            // TODO setObjectID !!!
            dbFile.remove({_id: _id}, callback);
        } catch (e) {
            callback(e);
        }
    }
};

module.exports = dbFile;