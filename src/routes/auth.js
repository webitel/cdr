var jwt = require('jwt-simple'),
    config = require('../config'),
    log = require('../libs/log')(module),
    crypto = require('crypto'),
    mongoDb = require('../libs/mongoDrv'),
    AUTH_DB_NAME = config.get("cdrDB:collectionAuth");


var auth = {

    selectDbUser: function (key, cb) {
        var _db = mongoDb.getCollection(AUTH_DB_NAME);
        _db.findOne({"key": key}, cb);
    },

    validateUser: function (key, cb) {
        try {
            auth.selectDbUser(key, function (err, dbUser) {
                if (err) {
                    log.error(err.message);
                    cb(err);
                    return;
                };
                cb(null, dbUser);
            });

        } catch (e){
            cb(e);
        }
    }
};

module.exports = auth;