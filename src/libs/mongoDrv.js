var MongoDb = require("mongodb")
    , MongoClient = MongoDb.MongoClient
    , format = require('util').format
    , config = require('../config')
    , log = require('../libs/log')(module);

var mongoClient = new MongoClient();


var drv = function (option) {

};

mongoClient.connect(config.get('cdrDB:uri') ,function(err, db) {
    if (err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };
    drv.cdrCollection = db.collection(config.get("cdrDB:collectionCDR"));
    drv.fileCollection = db.collection(config.get("cdrDB:collectionFile"));
    log.info('Connected db %s ', config.get('cdrDB:uri'));
    db.on('close', function () {
        log.error('close mongo');
    })
});

module.exports = drv;