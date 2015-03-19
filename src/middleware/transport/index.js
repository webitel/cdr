var file = require('./file/index')
    ,s3 = require('./s3/index')
    ,util = require('util')
    ,url = require("url")
    ,formidable = require('formidable')
    ,SAVE_FILE_TYPE = require('../../const/index').SAVE_FILE_TYPE
    ,fileDB = require('../../middleware/fileDB')
    ,log = require('../../libs/log')(module);

function getResponseObject (status, info, description) {
    return {
        "status": status,
        "info": info,
        "more info": description
    }
};

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
        switch (type.toLowerCase()) {
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
                log.error('Default transport incorrect.');
                break;
        };
        if (!isFiles) {
            log.warn('Formidable: not file stream!');
            res.status(400).send('Bad request!')
        };
    });
    return;
};

FileController.prototype.GetFile = function (req, res, next) {
    try {
        var id = req.params['id'];
        fileDB.getRecordFile(id, function (err, data) {
            if (err) next(err);
            if (!data || !data.path) {
                log.warn('file not found: %s', id);
                res.status(404).json(getResponseObject('error', 'file not found!'));
            } else {
                if (data['type'] == SAVE_FILE_TYPE.S3) {
                    s3.getMediaStream(req, res, data);
                } else /*if (data['type'] == SAVE_FILE_TYPE.FILE)*/ {
                    file.getMediaStream(req, res, data['path'])
                }
            };
        });
    } catch (e) {
        return next(e)
    };
};

FileController.prototype.DelFile = function (req, res, next) {
    var parts = url.parse(req.url, true, true);
    var recordId = req.params['id'];
    var query = parts.query;
    var delDB = Boolean(query.db);

    fileDB.getRecordFile(recordId, function (err, data) {
        if (err) next(err);
        if (!data || !data.path) {
            log.warn('file not found: %s', recordId);
            res.status(404).json(getResponseObject('error', 'file not found!'));
        } else {
            var _id = data['_id'];
            if (data['type'] == SAVE_FILE_TYPE.FILE) {
                file.deleteFile(data['path'], function (err) {
                    if (err) {
                        res.status(500).json(getResponseObject('error', err.message));
                        return;
                    }
                    if (delDB) {
                        fileDB.removeFileDB(_id, function (err) {
                            if (err) {
                                res.status(500).json(getResponseObject('error', err.message));
                                return;
                            };
                            res.status(200).send(data);
                        })
                    } else {
                        res.status(200).send(data);
                    }
                })
            } else if (data['type'] == SAVE_FILE_TYPE.S3) {
                s3.deleteFile(data, function (err, data) {
                    if (err) {
                        res.status(500).send(err);
                        return;
                    }
                    if (delDB) {
                        fileDB.removeFileDB(_id, function (err) {
                            if (err) {
                                res.status(500).send(err);
                                return;
                            }
                            res.status(200).send(data);
                        })
                    } else {
                        res.status(200).send(data);
                    }
                });
            };
        };
    });
};