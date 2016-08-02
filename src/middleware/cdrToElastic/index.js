/**
 * Created by i.n. on 15.06.2015.
 */

var conf = require('../../config'),
    elasticConf = conf.get('elastic'),
    elastic = require('./elastic')(elasticConf),
    async = require('async'),
    log = require('../../libs/log')(module);

var started = false;

var child_process = require('child_process');

if (elasticConf && elasticConf.enabled.toString() == 'true') {
    log.info('Start Mongodb to Elastic');
    initTemplates(function (err) {
        if (err) {
            return log.error(err);
        };
        // initExportProcess();
    });
};

module.exports.initExportProcess = function initExportProcess (sec) {
    var timeMSec = parseInt(sec) * 1000;
    var timerId = setTimeout(function tick() {

        var child = child_process.fork(
            __dirname +  '/process.js'
        );

        child.on('error', function (err) {
            log.error(err);
        });

        child.on('exit', function () {
            if (timeMSec) {
                log.trace('Next sync with %s msec', timeMSec);
                timerId = setTimeout(tick, timeMSec);
            } else {
                log.info(`End export process.`);
            }
        });

    }, 2000);
};

function initTemplates(cb) {
    const MAX_RETRY = 15,
        TIMEOUT = 5000
        ;
    var currentRetry = 0;

    (function retry (err, connecting) {
        if (connecting) {
            return elastic.indices.getTemplate(function (err, res) {
                if (err) {
                    return cb(err);
                };

                var elasticTemplatesNames = Object.keys(res);
                var templates = elasticConf.templates || [];

                var tasks = [];
                var delTemplate = [];

                templates.forEach(function (template) {
                    if (elasticTemplatesNames.indexOf(template.name) > -1) {
                        delTemplate.push(function (done) {
                            elastic.indices.deleteTemplate(
                                template,
                                function (err) {
                                    if (err) {
                                        log.error(err);
                                    } else {
                                        log.debug('Template %s deleted.', template.name)
                                    }
                                    done();
                                }
                            );
                        });
                    };

                    tasks.push(function (done) {
                        elastic.indices.putTemplate(
                            template,
                            function (err) {
                                if (err) {
                                    log.error(err);
                                } else {
                                    log.debug('Template %s - created.', template.name);
                                }
                                done();
                            }
                        );
                    });
                });

                if (tasks.length > 0) {
                    async.waterfall([].concat(delTemplate, tasks) , cb);
                } else {
                    cb();
                }
            });
        };
        if (currentRetry > MAX_RETRY) {
            return cb(new Error('No connect to elastic. Process export stop.'));
        }
        log.debug('Check elastic ping. Retry: ' + currentRetry++);

        setTimeout( () => elastic.ping({host: elasticConf.host, requestTimeout: TIMEOUT}, retry), TIMEOUT);
    })();


};