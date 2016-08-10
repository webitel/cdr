/**
 * Created by igor on 09.08.16.
 */

"use strict";
    
const log = require('../libs/log')(module),
    args = process.argv.slice(2),
    collectionNameCdr = require('../config').get('mongodb:collectionCDR'),
    config = {},
    currentDb = require('../libs/mongoDrv'),
    MongoDb = require("mongodb"),
    fromClient = new MongoDb.MongoClient(),
    _saveCdr = require('../middleware/saveCdr')._saveCdr,
    async = require('async');


for (let item of args) {
    let t = item.match(/-([^=]+)=(.*)/);
    if (!t || !t[1]) continue;
    config[t[1]] = t[2];
}

if (!config.from)
    return log.error(`-from is require.`);

if (!config.domain)
    log.warn(`Migrate all domain.`);

if (config.collections) {
    config.collections = config.collections.split(',')
} else {
    config.collections = ['cdr'];
}

if (config.domain) {
    log.info(`Start import domain ${config.domain} collection(s): ${config.collections}`);
} else {
    log.info(`Start import all domain collection(s): ${config.collections}`);
}
async.waterfall(
    [
        // Connect db from
        cb => fromClient.connect(config.from, cb),
        // Load data
        (fdb, cb) => {
            async.eachSeries(
                config.collections,
                (collectionName, cbCollection) => {
                    log.info(`Start migrate collection: ${collectionName}`);
                    loadCollection(collectionName, fdb, config.domain, cbCollection);
                },
                cb
            )
        }

    ],
    (err) => {
        if (err)
            log.error(err);
        process.exit(1);
    }
);

function loadCollection(collectionName, fdb, domainName, cb) {
    const migrateCollection = fdb.collection(collectionName),
        query = collectionQueryDomain(collectionName, domainName),
        saveFn = getSaveFn(collectionName),
        toCollection = currentDb.getCollection(collectionName)
        ;

    if (!toCollection) {
        return cb(new Error(`No connect cdr server`))
    }
    const stream = migrateCollection
            .find(query)
            .sort({"_id": 1})
            // .limit(100)
            //.batchSize(10000)
            .stream();
    stream.on('data', (doc)=> {
        stream.pause();
        let id = doc._id.toString();
        saveFn(doc, toCollection, (err) => {
            if (err && err.code === 11000) {
                log.warn(`-ERR skip ${id} - duplicate`);
            } else if (err) {
                return cb(err);
            } else {
                log.debug(`+OK save ${id}`);
            }
            return stream.resume();
        });
    });

    stream.on('end', cb);
}

function collectionQueryDomain(collectionName, domain) {
    if (!domain)
        return {};

    switch (collectionName) {
        case collectionNameCdr:
            return {"variables.domain_name": domain};
        default:
            return {domain: domain};
    }
}

function getSaveFn(collectionName) {
    if (saveData.hasOwnProperty(collectionName) && saveData[collectionName] instanceof Function) {
        return saveData[collectionName]
    }
    return (doc, toCollection, cb) => {
        log.debug(`try save ${doc._id}`);
        toCollection.insert(doc, cb);
    }
}

const saveData = {
    [collectionNameCdr]: (doc, toCollection, cb) => {
        _saveCdr(doc, cb);
    }
};

