var log = require('../libs/log')(module)
    ,url = require('url')
    ,downloadAcl = require('../middleware/downloadAcl').acl;

var showLegAList = require('../libs/mongo').showLegAList;
var showLegBList = require('../libs/mongo').showLegBList;
var showLegACount = require('../libs/mongo').showLegACount;
var aggregate = require('../libs/mongo').aggregate;

module.exports = function (app) {
    app.post('/login', require('./login').post);

    app.post('/logout', require('./logout').post);

    app.use('/api/*', require('../middleware/checkAuth').get);

    app.post('/api/list', function(req, res, next) {
        var columns = req.body.columns;
        var filter = req.body.filter;
        var limit = req.body.limit;
        var pageNumber = req.body.pageNumber;
        var sort = req.body.sort;
        var domain = req.session.domain;

        showLegAList(columns, filter, sort, limit, pageNumber, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/aggregate', function(req, res, next) {
        var aggr = req.body.aggr;
        var domain = req.session.domain;

        aggregate(aggr, domain, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/listLegB', function(req, res, next) {
        var columns = req.body.columns;
        var filter = req.body.filter;
        var legAUuid = req.body.legAUuid;
        var sort = req.body.sort;
        var domain = req.session.domain;

        if (!legAUuid || legAUuid == '') {
            res.send(400, "legAUuid - undefined");
            return;
        }

        showLegBList(columns, filter, sort, legAUuid, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/listACount', function (req, res, next) {
        var filter = req.body.filter;
        var domain = req.session.domain;
        showLegACount(filter, function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        })
    });

    app.get('/api/list', function (req, res, next) {
        showLegAList({}, {}, {}, 20, null, null, function(err, result) {
           // log.info(result);
            res.json(result);
        })
    });

    app.get('/forTest', function (req, res) {
        showLegAList({"_id": 1}, {}, {}, 20, null, null, function(err, result) {
            // log.info(result);
            res.json(result);
        })
    });

    app.put('/api/formLoadFile/:id/:type', require('../middleware/uploadRecordFile').SaveFile);

    app.get('/api/getFile?:id', downloadAcl, require('../middleware/loadRecordFile').GetFile);
    app.del('/api/delFiles', require('../middleware/deleteFile').DelFiles);
    app.del('/api/delFile?:id', require('../middleware/deleteFile').DelFile);
    //app.del('/api/delCDR', require('../middleware/deleteFile').DelCDR);

    app.get('/sounds/:id', downloadAcl, require('../middleware/soundsResource').GetFile);
};