var http = require("http")
    ,url = require("url")
    ,log = require('../../../libs/log')(module)
    ,config = require('../../../config/index')
    ,fs = require('fs-extra')
    ,SAVE_FILE_TYPE = require('../../../const/index').SAVE_FILE_TYPE
    ,fileDB = require('../../../middleware/fileDB')
    ,maskPath = config.get("recordFile:maskPath");

function saveToFile(file, query, res) {
    var uuid = query.id || new Date().getTime();
    var type = query.type || 'mp3';
    var namePref = query.name || 'none';
    var fileName = uuid + '_' + namePref + '.' + type;
    var date = new Date();
    var path = maskPath;
    var domain = query.domain || 'unknown';

    path = config.get("recordFile:fileRoot") + domain + '/' + path.replace(/\$Y/g, date.getFullYear()).replace(/\$M/g, (date.getMonth() + 1)).
        replace(/\$D/g, date.getDate()).replace(/\$H/g, date.getHours()).
        replace(/\$m/g, date.getMinutes());

    fs.ensureDir(path, function (err) {
        if (err) {
            log.error(err.message);
            res.status(500).send(err.message);
        } else {
            var filePath = path + '/' + fileName;
            fs.move(file['path'], filePath, {clobber: true}, function(err) {
                if(err) {
                    log.error(err.message);
                    res.status(500).send(err.message);
                } else {
                    fileDB.insertFile({
                        "uuid": uuid,
                        "name": namePref,
                        "path": filePath,
                        "domain": domain,
                        "content-type": res['incoming-content-type'],
                        "type": SAVE_FILE_TYPE.FILE,
                        "createdOn": new Date(),
                        "size": file["size"],
                        "requestCount": 0
                    }, function (err) {
                        if (err) return log.error(err.message);
                        res.status(204).send("File Upload Complete");
                        log.trace("save file %s - OK", filePath);
                    });
                };
            });
        }
    });
};

module.exports.SaveFile = function(req, res, file) {
    var query = req.query;
    saveToFile(file, query, res);
};

function readRangeHeader(range, totalLength) {
    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };

    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
};

function sendResponse(response, responseStatus, responseHeaders, readable) {
    //console.dir(responseStatus);
    response.writeHead(responseStatus, responseHeaders);

    if (readable == null)
        response.end();
    else
        readable.on('open', function () {
            readable.pipe(response);
        });

    return null;
}

module.exports.getMediaStream = function (req, res, data) {
    var file = data['path'];
    var contentType = data['content-type'] || 'audio/mpeg';
    var requestFileName = req.query['file_name'];

    fs.lstat(file, function (err, stat) {

        if (err) {
            res.status(500).json({
                "status": "error",
                "info": err.message
            });
        } else {
            if (!stat.isFile()) {
                return res.status(500).json({
                    "status": "error",
                    "info": 'Bad file.'
                });
            };

            var responseHeaders = {};
            if (requestFileName) {
                responseHeaders['Content-disposition'] = 'attachment;  filename=' + requestFileName;
            };
            var rangeRequest = readRangeHeader(req.headers['range'], stat.size);
            if (rangeRequest == null) {
                responseHeaders['Content-Type'] = contentType;
                responseHeaders['Content-Length'] = stat.size;
                responseHeaders['Accept-Ranges'] = 'bytes';

                sendResponse(res, 200, responseHeaders, fs.createReadStream(file));
                return null;
            };

            var start = rangeRequest.Start;
            var end = rangeRequest.End;

            if (start >= stat.size || end >= stat.size) {
                responseHeaders['Content-Range'] = 'bytes */' + stat.size; // File size.

                sendResponse(res, 416, responseHeaders, null);
                return null;
            };

            responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
            responseHeaders['Content-Length'] = start == end ? 0 : (end - start + 1);
            responseHeaders['Content-Type'] = contentType;
            responseHeaders['Accept-Ranges'] = 'bytes';
            responseHeaders['Cache-Control'] = 'no-cache';

            sendResponse(res, 206, responseHeaders, fs.createReadStream(file, {flags: 'r', start: start, end: end }));
        }
    });

};

module.exports.deleteFile = function (filePath, callback) {
    var file = filePath;
    fs.lstat(filePath, function (err, stat) {
        if (err) {
            log.error('File not found ', err);
            callback(err, null);
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
        };
    });
};