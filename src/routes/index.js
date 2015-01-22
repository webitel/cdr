var log = require('../libs/log')(module)
    ,url = require('url')
    ,downloadAcl = require('../middleware/uploadAcl');


var Transport = require('../middleware/transport');
var transport = new Transport();

var saveTypeFile = require('../config').get('recordFile:transport');

var cdrDB = require('../middleware/cdrDB');

module.exports = function (app) {

    app.all('/api/*', [require('../middleware/checkAuth')]);

    app.post('/api/list', function(req, res, next) {
        var columns = req.body.columns;
        var filter = req.body.filter;
        var limit = req.body.limit;
        var pageNumber = req.body.pageNumber;
        var sort = req.body.sort;
        var domain = req['webitelDomain'];

        cdrDB.showLegAList(columns, filter, sort, limit, pageNumber, domain, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/aggregate', function(req, res, next) {
        var aggr = req.body.aggr;
        var domain = req['webitelDomain'];

        cdrDB.aggregate(aggr, domain, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/listLegB', function(req, res, next) {
        var columns = req.body.columns;
        var filter = req.body.filter;
        var legAUuid = req.body.legAUuid;
        var sort = req.body.sort;
        var domain = req['webitelDomain'];

        if (!legAUuid || legAUuid == '') {
            res.send(400, "legAUuid - undefined");
            return;
        };
        cdrDB.showLegBList(columns, filter, sort, legAUuid, domain, function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    });

    app.post('/api/listACount', function (req, res, next) {
        var filter = req.body.filter;
        var domain = req['webitelDomain'];

        cdrDB.showLegACount(filter, domain, function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    });

    app.get('/api/list', function (req, res, next) {
        cdrDB.showLegAList({}, {}, {}, 10, 1, req['webitelDomain'], function(err, result) {
            // log.info(result);
            res.json(result);
        });
    });

    // /sys/formLoadFile?domain=10.10.10.144&&id=test&&format=mp3
    app.put('/sys/formLoadFile?:id', downloadAcl, function (req, res, next) {
        transport.SaveFile(req, res, next, saveTypeFile);
    });

    app.get('/api/getFile?:id', transport.GetFile);

    //app.delete('/api/delFiles', require('../middleware/deleteFile').DelFiles);

    app.delete('/api/delFile?:id', transport.DelFile);

    //app.del('/api/delCDR', require('../middleware/deleteFile').DelCDR);

    app.get('/sounds/:id', require('../middleware/soundsResource').GetFile);
};