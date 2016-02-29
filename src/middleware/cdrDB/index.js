var db = require('../../libs/mongoDrv'),
    ObjectId = require('mongodb').ObjectId,
    checkPermission = require('../../middleware/acl'),
    log = require('../../libs/log');

var cdr = {
    all: function (cb) {
        var cdrCollection = db.cdrCollection;
        cdrCollection.find()
            .limit(10)
            .toArray(cb)
    },
    showLegAList: function (columns, filter, sort, limit, pageNumber, domain, req, callback) {

        var acl = req.webitelUser && req.webitelUser.attr.acl,
            _ro = false
        ;
        var cdrCollection = db.cdrCollection;
        columns = columns || defColumns;
        sort = sort || {
            "callflow.times.created_time": -1
        };

        limit = Number(limit) || 40;

        // TODO
        var query = buildFilterQuery(filter);
        if (domain && typeof domain == "string")
            query['$and'].push({
                "variables.domain_name": domain
            });

        var _readAll = checkPermission(acl, 'cdr', 'r');

        if (!_readAll && checkPermission(acl, 'cdr', 'ro', true)) {
            query['$and'].push({
                "variables.presence_id": req.webitelUser.attr['id']
            });
            _ro = true;
        };
        if (!_ro && !_readAll) {
            return callback(new Error("Permission denied!"))
        }

        cdrCollection.find(query, columns)
            .sort(sort)
            .skip(pageNumber > 0 ? ((pageNumber - 1) * limit) : 0)
            .limit(limit)
            .toArray(function(err, results) {
                if (typeof callback == "function")
                    callback(err, results);
            });
    },

    showLegBList: function (columns, filter, sort, legAUuid, domain, callback) {
        var cdrCollection = db.cdrCollection;
        columns = columns || defColumns;
        sort = sort || {};

        var filterArray = [];
        filterArray.push(setFilterLegB(legAUuid));

        // TODO проверить на верто что будет в dialed_domain
        if (domain && typeof domain == "string") {
            filterArray.push({
                "variables.dialed_domain": domain
            })
        };
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
        //log.info('filter: ' + JSON.stringify(query) + '\n sort: ' + JSON.stringify(getLastIdSort(sort)));
        cdrCollection.find(query, columns)
            .sort(getLastIdSort(sort))
            .toArray(function(err, results) {
                callback(err, results);
            });
    },

    showLegACount: function (filter, domain, req, callback) {
        var cdrCollection = db.cdrCollection;

        var acl = req.webitelUser && req.webitelUser.attr.acl,
            _ro = false
            ;


        var query = buildFilterQuery(filter);
        if (domain && typeof domain == "string")
            query['$and'].push({
                "variables.domain_name": domain
            });


        var _readAll = checkPermission(acl, 'cdr', 'r');

        if (!_readAll && checkPermission(acl, 'cdr', 'ro', true)) {
            query['$and'].push({
                "variables.presence_id": req.webitelUser.attr['id']
            });
            _ro = true;
        };
        if (!_ro && !_readAll) {
            return callback(new Error("Permission denied!"))
        }


        cdrCollection.find(query).count(function(err, results) {
            callback(err, results);
        });
    },

    aggregate: function (aggr, domain, callback) {
        var cdrCollection = db.cdrCollection;
        var _q;
        if (domain && typeof domain == "string") {
            _q = {
                "$match": {
                    "$and": [
                        {
                            "variables.domain_name": domain
                        },
                        filterLegA
                    ]
                }
            }
        } else {
            _q = {
                "$match": filterLegA
            }
        }
        try {
            //aggr.unshift(_q);
            cdrCollection.aggregate(aggr, function (err, result) {
                callback(err, result);
            })
        } catch (e) {
            callback(500);
        }
    }
};

module.exports = cdr;


var defColumns = {
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
    //filterArray.push(filterLegA); // TODO
    if (filter) {
        for (var key in filter) {
            if (key == '_id' && ObjectId.isValid(filter[key])) {
                filter[key] = ObjectId(filter[key]);
                continue;
            }
            for (var item in filter[key]) {
                // TODO ... parse _id
                if (key == '_id' && ObjectId.isValid(filter[key][item])) {
                    filter[key][item] = ObjectId(filter[key][item]);
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