var jwt = require('jwt-simple'),
    config = require('../config'),
    redis = require("redis"),
    DB_INDEX = config.get('redis:db_index'),
    client = redis.createClient(config.get('redis:port'), config.get('redis:host'), {}),
    log = require('../libs/log')(module),
    crypto = require('crypto');

client.on('error', function (err) {
    log.error(err.message || 'Redis server ERROR!');
});

client.select(DB_INDEX, function (err) {
    if (err) throw err;
    log.info('Select database: ', DB_INDEX);
});

client.on('connect', function () {
    log.info('Connected db redis: ' + this.address);
});

var auth = {

    validateUser: function (key, cb) {
        try {
            if (client.connected) {
                client.get('session:' + key, function (err, dbUser) {
                    if (err) {
                        log.error(err.message);
                        cb(err);
                        return;
                    };
                    cb(null, JSON.parse(dbUser));
                });
            } else {
                cb('Connected redis error.');
            }
        } catch (e){
            cb(e);
        }
    }
};

module.exports = auth;