/**
 * Created by i.navrotskyj on 27.02.2015.
 */

var Transport = require('../../middleware/transport');
var transport = new Transport();
var fileDb = require('../../middleware/fileDB');

module.exports = {
    getResource: function (req, res, next) {
        try {
            transport.GetFile(req, res, next);
        } catch (e) {
            next(e);
        }
    },

    deleteResource: function (req, res, next) {
        try {
            transport.DelFile(req, res, next);
        } catch (e) {
            next(e);
        }
    },
    
    getFileStats: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];

        fileDb.getFilesStats(req.params['id'], domain, req.query, function (err, result) {
            if (err) {
                next(err);
                return;
            };
            var _size = result;

            if (result instanceof Array) {
                _size = result[0];
            };

            if (!_size) {
                _size = {
                    "size": 0
                };
            };
            res.status(200).json(_size);
        });
    }
};