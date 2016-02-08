var winston = require('winston');
var config = require('../config');

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
                level: config.get('application:loglevel'),
                label: path,
                timestamp: true
            })
        ]
    });

    return logger;
}

module.exports = getLogger;