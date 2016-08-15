/**
 * Created by igor on 01.08.16.
 */

"use strict";

const log = require('../libs/log')(module),
    async = require('async'),
    mongoCdr = require('./cdrDB'),
    conf = require('../config'),
    elasticConf = conf.get('elastic'),
    saveElastic = elasticConf && ('' + elasticConf.enabled === 'true'),
    elastic = require('./elastic')
    ;


let _elasticConnect = true;

let _saveCdr = module.exports._saveCdr = (cdrData, callback) => {
    let data = replaceVariables(cdrData);

    async.waterfall(
        [
            (cb) => {
                if (data.callflow instanceof Array &&  /^u:/.test(data.callflow[0].caller_profile.destination_number)) {
                    data.callflow[0].caller_profile.destination_number = data.variables.presence_id;
                }
                if (data && data.variables && !data.variables.domain_name && /@/.test(data.variables.presence_id)) {
                    data.variables.domain_name = data.variables.presence_id.split('@')[1];
                }
                mongoCdr.insert(data, cb);
            },
            (result, cb) => {
                if (saveElastic && result && result.ops && result.ops[0]) {
                    let _id = result.ops[0]._id;
                    elastic._insert(result.ops[0], (err) => {
                        if (err && !~err.message.indexOf('document_already_exists_exception')) {
                            log.warn(`no save elastic: ${err}`);
                            _elasticConnect = false;
                            return mongoCdr.updateById(_id, {"$set": {"_elasticExportError": true}}, cb);
                        } else {
                            if (_elasticConnect === false)
                                processSaveToElastic();
                            _elasticConnect = true;
                        }

                        return cb(err)
                    });
                } else {
                    cb();
                }
            }
        ],
        callback
    )
};

module.exports.post = (req, res, next) => {
    let uuid = req.query.uuid;
    log.trace(`try save ${uuid}`);
    _saveCdr(req.body, (err) => {
        if (err) {
            log.error(err);
            return next(err);
        }

        log.debug(`Ok save: ${uuid}`);
        res.status(200).end();
    });
};

var processSaveToElastic = module.exports.processSaveToElastic = function () {
    if (!saveElastic) return;
    mongoCdr._find({"_elasticExportError": true}, (err, data) => {
        if (err) {
            return log.error(err);
        }

        if (data instanceof Array) {
            async.every(
                data,
                (doc, cb) => {
                    let _id = doc._id;
                    elastic._insert(doc, (err) => {
                        if (err && !~err.message.indexOf('document_already_exists_exception'))
                            return cb(err);
                        log.debug(`Save elastic document: ${_id}`);
                        return mongoCdr.updateById(_id, {"$unset": {"_elasticExportError": 1}}, cb);
                    })
                },
                (err) => {
                    if (err)
                        log.error(err);

                }
            )
        } else {
            log.error(`Bad response find no save elastic data`);
        }
    })
};

function replaceVariables(data) {

    for (let key in data.variables) {
        if (isFinite(data.variables[key]))
            data.variables[key] = +data.variables[key];

        if (/\.|\$/.test(key)) {
            data.variables[encodeKey(key)] = data.variables[key];
            delete data.variables[key];
        }
    }
    if (data.callflow instanceof Array) {
        for (let cf of data.callflow) {
            if (cf.hasOwnProperty('times')) {
                for (let key in cf.times) {
                    cf.times[key] = +cf.times[key];
                }
            }
        }
    }
    return data
}

function encodeKey(key) {
    return key.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, "\\u002e")
}