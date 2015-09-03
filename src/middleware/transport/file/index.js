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
    var fileName = uuid + '.' + type;
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
            if (!stat.isFile()) return;

            var start = 0;
            var end = 0;
            var range = req.header('Range');
            if (range != null) {
                start = parseInt(range.slice(range.indexOf('bytes=') + 6,
                    range.indexOf('-')));
                end = parseInt(range.slice(range.indexOf('-') + 1,
                    range.length));
            }
            if (isNaN(end) || end == 0) end = stat.size - 1;

            if (start > end) return;

            var responseHeaders = {
                'Connection':'close',
                'Cache-Control':'private',
                'Content-Type': contentType,
                'Content-Length': end - start,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
                'Accept-Ranges':'bytes',
//        'Server':'webitel',
                'Transfer-Encoding':'chunked'
            };

            if (requestFileName) {
                responseHeaders['Content-disposition'] = 'attachment;  filename=' + requestFileName;
            };

            res.writeHead(206, responseHeaders);

            var stream = fs.createReadStream(file,
                { flags: 'r', start: start, end: end});
            
            stream.on('open', function () {
                stream.pipe(res);
            });


            stream.on('error', function (err) {
                res.statusCode = 500;
                log.error('Server load stream error ', err);
                res.end('Server load stream error: ' + err.message);
                //stream.destroy();
            });

            res.on('close', function () {
                stream.destroy();
            });
            req.on('finish', function(){
            });
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