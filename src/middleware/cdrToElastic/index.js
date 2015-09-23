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
        initExportProcess();
    });
};

function initExportProcess () {
    var timeMSec = parseInt(elasticConf.intervalMin) * 60 * 1000;
    var timerId = setTimeout(function tick() {

        var child = child_process.fork(
            __dirname +  '/process.js'
        );

        child.on('error', function (err) {
            log.error(err);
        });

        child.on('exit', function () {
            log.trace('Next sync with %s min', elasticConf.intervalMin);
            timerId = setTimeout(tick, timeMSec);
        });

    }, 2000);
};

function initTemplates(cb) {
    elastic.indices.getTemplate(function (err, res) {
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