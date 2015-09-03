var aws = require('aws-sdk')
    ,log = require('../../../libs/log')(module)
    ,config = require('../../../config/index')
    ,rootBucket = config.get('recordFile:fileRoot')
    ,SAVE_FILE_TYPE = require('../../../const/index').SAVE_FILE_TYPE
    ,fileDB = require('../../../middleware/fileDB')
    ,fs = require('fs')
    ,maskPath = config.get("recordFile:maskPath");

aws.config.update(config.get("recordFile:awsConfig"));
aws.config.httpOptions = {timeout: 5000};

// Create an S3 client
var s3 = new aws.S3();

var bucketName = (rootBucket)
        ? rootBucket.replace(/\//g,'')
        : 'webitel';

function saveToFile(file, query, res) {
    var uuid = query.id || new Date().getTime();
    var type = query.type || 'mp3';
    var keyName = uuid + '.' + type;
    var date = new Date();
    var domain = query.domain || 'unknown';
    var localFileTmp = file['path'];
    var fileSize = file["size"];

    var path = maskPath || '';

    path = domain + '/' + path.replace(/\$Y/g, date.getFullYear()).replace(/\$M/g, (date.getMonth() + 1)).
        replace(/\$D/g, date.getDate()).replace(/\$H/g, date.getHours()).
        replace(/\$m/g, date.getMinutes());

    path += '/' + keyName;

//    s3.createBucket({Bucket: bucketName}, function() {
        var fileStream = fs.createReadStream(localFileTmp);
        fileStream.on('error', function (err) {
            if (err) {
                log.error(err);
                res.status(500).send(err);
            }
        });
        fileStream.on('open', function () {
            s3.putObject({
                Bucket: bucketName,
                Key: path,
                Body: fileStream,
                ContentType: res['incoming-content-type'] || 'audio/mpeg'
            }, function (err) {
                if (err) {
                    log.error(err);
                    res.status(500).send(err);
                    return;
                };
                fileDB.insertFile({
                    "uuid": uuid,
                    "path": path,
                    "domain": domain,
                    "content-type": res['incoming-content-type'] || 'audio/mpeg',
                    "bucketName": bucketName,
                    "type": SAVE_FILE_TYPE.S3,
                    "createdOn": new Date(),
                    "size": fileSize,
                    "requestCount": 0
                }, function (err) {
                    if (err) return log.error(err.message);
                    res.send(204);
                    log.trace("save file %s - OK", path);

                    fs.unlink(localFileTmp, function (err) {
                        if (err)
                            log.error(err);
                    });
                });
            });
        });
  //  });
};

module.exports.SaveFile = function(req, res, file) {
    var query = req.query;
    saveToFile(file, query, res);
};

module.exports.getMediaStream = function (req, res, file) {
    try {
        var params = {
            Bucket: file['bucketName'],
            Key: file['path']
        };
        var requestFileName = req.query['file_name'];

        if (requestFileName) {
            params.ResponseContentDisposition = 'attachment;  filename=' + requestFileName;
        };
        var url = s3.getSignedUrl('getObject', params);

        var responseHeaders = {
            'Location': url,
            'Content-Type': file['content-type'] || 'audio/mpeg'
        };
        res.writeHead(302, responseHeaders);
        res.end();
    } catch (e) {
        log.error(e.message);
    };
};

module.exports.deleteFile = function (file, callback) {
    var params = {
        Bucket: file['bucketName'],
        Key: file['path']
    };
    s3.deleteObject(params, callback);
};