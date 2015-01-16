var http = require("http")
    ,url = require("url")
    ,log = require('../../log')(module)
    ,config = require('../../../config/index')
    ,fs = require('fs-extra')
    ,SAVE_FILE_TYPE = require('../../../const').SAVE_FILE_TYPE
    ,insertFile = require('../../mongo').InsertFile
    ,maskPath = config.get("recordFile:maskPath");

function saveToFile(file, query, res) {
    var uuid = query.id || new Date().getTime();
    var type = query.type || 'mp3';
    var fileName = uuid + '.' + type;
    var date = new Date();
    var path = maskPath;

    path = config.get("recordFile:fileRoot") + path.replace(/\$Y/g, date.getFullYear()).replace(/\$M/g, (date.getMonth() + 1)).
        replace(/\$D/g, date.getDate()).replace(/\$H/g, date.getHours()).
        replace(/\$m/g, date.getMinutes());

    fs.ensureDir(path, function (err) {
        if (err) {
            log.error(err.message);
            res.send(500);
        } else {
            var filePath = path + '/' + fileName;
            fs.move(file['path'], filePath, {clobber: true}, function(err) {
                if(err) {
                    log.error(err.message);
                    res.send(500, err.message);
                } else {
                    insertFile({
                        "uuid": uuid,
                        "path": filePath,
                        "type": SAVE_FILE_TYPE.FILE,
                        "createdOn": new Date(),
                        "requestCount": 0
                    }, function (err) {
                        if (err) return log.error(err.message);
                        res.send(204, "File Upload Complete");
                        log.info("save file %s - OK", filePath);
                    });
                };
            });
        }
    });
};

module.exports.SaveFile = function(req, res, file) {
    var query = req.params;
    saveToFile(file, query, res);
};

module.exports.getMediaStream = function (req, res, file) {

    fs.lstat(file, function (err, stat) {

        if (err) {
            res.statusCode = 500;
            res.end('File not found: ' + err);
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

            res.writeHead(206, {
                'Connection':'close',
                'Cache-Control':'private',
                'Content-Type': 'audio/mpeg',
                'Content-Length': end - start,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
                'Accept-Ranges':'bytes',
//        'Server':'webitel',
                'Transfer-Encoding':'chunked'
            });

            var stream = fs.createReadStream(file,
                { flags: 'r', start: start, end: end});
            stream.pipe(res);

            stream.on('error', function (err) {
                res.statusCode = 500;
                log.error('Server load stream error ', err);
                res.end('Server load stream error: ' + err.message);
            });

            res.on('close', function () {
                stream.destroy();
            });
            req.on('finish', function(){
            });
        }
    });

};