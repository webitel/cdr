var winston = require('winston');
var config = require('../config');
var path = require('path');
var ENV = process.env.NODE_ENV;

function getLogger(module) {

    var pathModule = module.filename.split('/').slice(-2).join('/');
    return new winston.Logger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                level: (ENV == 'development') ? 'debug' : 'debug',
                label: pathModule
            }),
            new winston.transports.File({
                filename: config.get('log:file'),
                maxsize: config.get('log:maxSize'),
                maxFiles: config.get('log:maxFiles'),
                level: (ENV == 'development') ? 'debug' : 'error',
                label: pathModule
            })
        ]
    });
}

module.exports = getLogger;