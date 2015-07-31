var file = require('./file/index')
    ,s3 = require('./s3/index')
    ,util = require('util')
    ,url = require("url")
    ,formidable = require('formidable')
    ,SAVE_FILE_TYPE = require('../../const/index').SAVE_FILE_TYPE
    ,fileDB = require('../../middleware/fileDB')
    ,email = require('../email')
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

FileController.prototype.sendEMail = function (req, files, cb) {
    if (req.query['email'] && req.query['email'] != 'none') {
        try {
            var fileName = req.query['id'] + '.' + req.query['type'];
            var subject, text;
            if (req.query['type'] === 'pdf') {
                subject = '[webitel] You have received a new fax';
                text = 'You have received a new fax from Webitel Fax Server\n\n--\nWebitel Cloud Platform';
            } else {
                subject = '[webitel] You have received a new call record file';
                text = 'You have received a new call record file from Webitel\n\n--\nWebitel Cloud Platform';
            }
            ;
            var attachments = [];

            for (var key in files) {
                attachments.push({
                    "path": files[key]['path'],
                    "filename": fileName
                });
            }
            ;
            email.send(
                {
                    "to": req.query['email'],
                    "subject": subject,
                    "text": text,
                    "attachments": attachments
                },
                req.query['domain'],
                function (err, info) {
                    if (err) {
                        log.warn(err['message']);
                    } else {
                        log.trace('Send file %s to email(s) %s', fileName, req.query['email']);
                    };
                    cb(err, info);
                });
        } catch (e) {
            cb(e);
        };
    } else {
        cb();
    };
};

FileController.prototype.SaveFile = function (req, res, next, type) {

    var form = new formidable.IncomingForm();
    var scope = this;

    // TODO
    res['incoming-content-type'] = req['headers']['content-type'];
    req['headers']['content-type'] = 'octet-stream';

    form.parse(req, function(err, fields, files) {
        if (err) return next(err);
        var isFiles = false;

        scope.sendEMail(req, files, function (err, info) {
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
    });
    return;
};

FileController.prototype.GetFile = function (req, res, next) {
    try {
        var id = req.params['id'];
        var query;
        var contentType = req.query['type'] || 'audio/mpeg';

        switch (contentType) {
            case 'all':
                query = {
                    "uuid": id
                };
                break;
            case 'audio/mpeg':
                query = {
                    "$and": [{
                        "uuid": id
                    },{
                        "$or": [{
                            "content-type": contentType
                        }, {
                            "content-type": {
                                "$exists": false
                            }
                        }]
                    }]
                };
                break;
            default:
                query = {
                    "uuid": id,
                    "content-type": contentType
                };
                break;
        };

        fileDB.getRecordFile(query, function (err, resJson) {
            if (err) return next(err);

            if (contentType === 'all') {
                res.status(200).json(resJson);
                return;
            };

            var data = resJson[0];

            if (!data || !data.path) {
                log.warn('file not found: %s', id);
                res.status(404).json(getResponseObject('error', 'file not found!'));
            } else {
                if (data['type'] == SAVE_FILE_TYPE.S3) {
                    s3.getMediaStream(req, res, data);
                } else /*if (data['type'] == SAVE_FILE_TYPE.FILE)*/ {
                    file.getMediaStream(req, res, data)
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
    var contentType = query['type'] || '';

    fileDB.getRecordFile(recordId, function (err, fileData) {
        if (err) next(err);
        var data = fileData[0];
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