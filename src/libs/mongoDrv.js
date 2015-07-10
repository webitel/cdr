var MongoDb = require("mongodb")
    , MongoClient = MongoDb.MongoClient
    , format = require('util').format
    , config = require('../config')
    , log = require('../libs/log')(module);

var mongoClient = new MongoClient();


var drv = function (option, cb) {

};

drv._initDB = function (db) {
    this.db = db;
    return this.db;
};

mongoClient.connect(config.get('cdrDB:uri') ,function(err, db) {
    if (err) {
        log.error('Connect db error: %s', err.message);
        throw err;
    };
    drv._initDB(db);
    // TODO
    drv.cdrCollection = db.collection(config.get("cdrDB:collectionCDR"));
    drv.fileCollection = db.collection(config.get("cdrDB:collectionFile"));
    log.info('Connected db %s ', config.get('cdrDB:uri'));
    db.on('close', function () {
        log.error('close mongodb');
    });

    // TODO
    var elasticConf = config.get('elastic');
    if (elasticConf && elasticConf.enabled.toString() == 'true') {
        log.info('Start Mongodb to Elastic');
        require('../middleware/cdrToElastic')(db);
    }
});

drv.getCollection = function (name) {
    try {
        return this.db.collection(name)
    } catch (e) {
        log.error(e.message);
    }
};

module.exports = drv;