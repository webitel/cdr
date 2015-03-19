var winston = require('winston');
var config = require('../config');
require('winston-logstash');

function getLogger(module) {

    var path = module.filename.split('//').slice(-2).join('//');

    var logLevels = {
        levels: {
            trace: 0,
            debug: 1,
            warn: 2,
            error: 3,
            info: 4
        },
        colors: {
            trace: 'yellow',
            debug: 'yellow',
            info: 'green',
            warn: 'yellow',
            error: 'red'
        }
    };
    winston.addColors(logLevels.colors);
    var logger = new (winston.Logger)({
        levels: logLevels.levels,
        transports: [
            new winston.transports.Console({
                colorize: true,
                level: config.get('application:log:loglevel'),
                label: path,
                timestamp: true
            })
            //,
            //new winston.transports.File({
            //    filename: config.get('application:log:file'),
            //    maxsize: config.get('application:log:maxSize'),
            //    maxFiles: config.get('application:log:maxFiles'),
            //    level: config.get('application:log:loglevel'),
            //    label: path,
            //    timestamp: true
            //})
        ]
    });

    if (config.get('application:log:logstash:enabled')) {
        logger.add(winston.transports.Logstash, {
            port: config.get('application:log:logstash:port'),
            node_name: config.get('application:log:logstash:node_name'),
            host: config.get('application:log:logstash:host'),
            level: config.get('application:log:loglevel')
        });
    };

    return logger;
}

module.exports = getLogger;