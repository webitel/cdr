var file = require('./file')
    ,s3 = require('./s3')
    ,util = require('util')
    ,url = require("url")
    ,formidable = require('formidable')
    ,SAVE_FILE_TYPE = require('../../const').SAVE_FILE_TYPE
    ,getRecordFile = require('../../libs/mongo').GetRecordFile;

var FileController = module.exports = function (option) {
};

FileController.prototype.SaveFile = function (req, res, next, type) {

    var form = new formidable.IncomingForm();
    if (req['headers']['content-type'] == 'audio/wav' || req['headers']['content-type'] == 'audio/mpeg') {
        req['headers']['content-type'] = 'octet-stream';
    };

    form.parse(req, function(err, fields, files) {
        if (err) return next(err);
        var isFiles = false;
        switch (type) {
            case 'file':
                for (var key in files) {
                    file.SaveFile(req, res, files[key]);
                    isFiles = true;
                };
                break;
            case 's3':
                for (var key in files) {
                    s3.SaveFile(req, res, files[key]);
                    isFiles = true;
                };
                break;
            default :
        };

        if (!isFiles) {
            res.send(400, 'Bad request!')
        }
    });
    return;
};

FileController.prototype.GetFile = function (req, res, next) {
    try {
        var parts = url.parse(req.url, true, true);
        var query = parts.query;
        var id = query.uuid;
    } catch (e) {
        return next(e)
    };

    getRecordFile(id, function (err, data) {
        if (err) next(err);
        if (!data || !data.path) {
            log.warn('file not found: %s', id);
            res.send(404, "file not found!")
        } else {
            if (data['type'] == SAVE_FILE_TYPE.FILE) {
                file.getMediaStream(req, res, data['path'])
            } else if (data['type'] == SAVE_FILE_TYPE.S3) {
                s3.getMediaStream(req, res, data)
            }

        };
    });
}