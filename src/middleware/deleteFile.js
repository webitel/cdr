var url = require("url")
    ,log = require('../libs/log')(module)
    ,fs = require('node-fs')
    ,getRecordFile = require('../libs/mongo').GetRecordFile
    ,getRecordFilesFromUuids = require('../libs/mongo').GetRecordFilesFromUuids
    ,async = require('async');


var deleteFile = function (filePath, callback) {
    var file = filePath;
    fs.lstat(filePath, function (err, stat) {
        if (err) {
            log.error('File not found ', err);
            callback(err, null);
            //res.send(500, 'File not found: ' + err);
        } else {
            if (!stat.isFile()) return;
            fs.unlink(file, function (err) {
                if (err) {
                    callback(err, null);
                    return;
                };
                log.trace('Successfully deleted file %s', file);
                callback(null, 'Successfully deleted file');
            });
        }
    });
};

module.exports.DelFile = function (req, res, next) {
    var parts = url.parse(req.url, true, true);
    var query = parts.query;
    if ((typeof query == "undefined") || !query.uuid) {
        res.send(500, 'bad request');
        return;
    }
    var id = Number(query.uuid);
    getRecordFile(id, function (err, data) {
        if (err) next(err);
        if (!data || !data.path) {
            log.warn('file not found: %s', query.uuid);
            res.send(500, "file not found!")
        } else {
            deleteFile(data.path, function(err, message){
                if (err) {
                    res.send(500, err);
                    return;
                }
                res.send(200, message);
            })
        }
    });
}

module.exports.DelFiles = function (req, res, next) {
    var uuids = req.body['uuids[]'];
    var starDate = req.body['startDate'];
    var dueDate = req.body['endDate'];
    if (!uuids && !starDate && !dueDate) {
        res.send(400); // bad request
        return;
    };
    if (uuids) {
        deleteFilesFromUuids(uuids, function (status, message) {
            res.send(status, message);
            return;
        });
    } else {
        res.send(200);
    }
}

function deleteFilesFromUuids (uuids, callback) {
    // TODO from int TEST
    try {
        uuids = uuids.map(function (x) {
            return parseInt(x, 10);
        });
    } catch (e) {
        callback(e)
        return;
    }

    getRecordFilesFromUuids(uuids, function (err, cursor) {
        if (err) {
            callback(err);
            return;
        };
        var tasks = [];

        function wrap() {
            var args = Array.prototype.slice.call(arguments),
                func = args.pop();

            return function (asyncCb) {
                args.push(asyncCb);
                func.apply(null, args);
            };
        };

        for (var key in cursor) {
            tasks.push(
                wrap(cursor[key].path, deleteFile)
            )
        }
        async.parallel(tasks, function (err, results) {
            if (err) {
                callback(500, err)
            } else {
                callback(200, 'deleted');
            }
        });
    });
}