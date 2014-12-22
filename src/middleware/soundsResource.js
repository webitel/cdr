var fs = require('fs')
    ,url = require("url")
    ,util = require('util')
    ,log = require('../libs/log')(module)
    ,config = require('../config')
    ,resourcePath = config.get("resource:path");

function getMediaSteram (req, res, file) {

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
                console.log('ended');
            });
        }
    });
};

module.exports.GetFile = function (req, res, next) {
    try {
        var _path = resourcePath + '/' + req.params.id;
        getMediaSteram(req, res, _path);
    } catch (e) {
        res.send(400)
    };
}