/**
 * Created by i.navrotskyj on 27.02.2015.
 */

var cdrDB = require('../../middleware/cdrDB'),
    log = require('../../libs/log')(module);

module.exports = {

    // TODO /api/list +
    showPostList: function (req, res, next) {
        try {
            var columns = req.body.columns;
            var filter = req.body.filter;
            var limit = req.body.limit;
            var pageNumber = req.body.pageNumber;
            var sort = req.body.sort;
            var domain = req['webitelDomain'];

            cdrDB.showLegAList(columns, filter, sort, limit, pageNumber, domain, req, function (err, data) {
                if (err) return next(err);
                res.json(data);
            });
        } catch (e){
            next(e);
        };
    },

    // TODO /api/list +
    showGetList: function (req, res, next) {
        try {
            cdrDB.showLegAList(null, {}, {}, 10, 1, req['webitelDomain'], req, function (err, result) {
                if (err) return next(err);
                res.json(result);
            });
        } catch (e) {
            next(e);
        };
    },

    // TODO /api/aggregate +
    aggregate: function (req, res, next) {
        try {
            var aggr = req.body.aggr;
            var domain = req['webitelDomain'];

            cdrDB.aggregate(aggr, domain, function (err, data) {
                if (err) return next(err);
                res.json(data);
            });
        } catch (e) {
            next(e);
        };
    },
    // TODO /api/listLegB
    showListB: function (req, res, next) {
        try {
            var columns = req.body.columns;
            var filter = req.body.filter;
            var legAUuid = req.body.legAUuid;
            var sort = req.body.sort;
            var domain = req['webitelDomain'];

            if (!legAUuid || legAUuid == '') {
                res.status(400).send("legAUuid - undefined");
                return;
            };
            cdrDB.showLegBList(columns, filter, sort, legAUuid, domain, function (err, data) {
                if (err) return next(err);
                res.json(data);
            });
        } catch (e) {
            next(e);
        };
    },
    // TODO /api/listACount
    showListACount: function (req, res, next) {
        try {
            var filter = req.body.filter;
            var domain = req['webitelDomain'];

            cdrDB.showLegACount(filter, domain, req, function (err, data) {
                if (err)
                    return next(err);
                res.json(data);
            });
        } catch (e) {
            next(e);
        };
    }
};