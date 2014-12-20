var http = require("http")
    ,url = require("url")
    ,log = require('../libs/log')(module)
    ,config = require('../config')
    ,fs = require('node-fs')
    ,insertFile = require('../libs/mongo').InsertFile;

function saveToFile(data, query, res) {
    var uuid = query.id || new Date().getTime();
    var type = query.type || 'mp3';
    var fileName = uuid + '.' + type;
    var date = new Date();
    var path = config.get("recordFile:filePath");

    path = config.get("recordFile:fileRoot") + path.replace(/\$Y/g, date.getFullYear()).replace(/\$M/g, (date.getMonth() + 1)).
        replace(/\$D/g, date.getDate()).replace(/\$H/g, date.getHours()).
        replace(/\$m/g, date.getMinutes());

    fs.mkdir(path, 0777, true, function (err) {
        if (err) {
            log.error(err.message);
            res.send(500);
        } else {
            var filePath = path + '/' + fileName;
            // TODO сделать запись файла стримом из буфера
            fs.writeFile(filePath, data, function(err) {
                if(err) {
                    log.error(err.message);
                    res.send(500);
                } else {
                    insertFile(uuid, filePath, function (err) {
                        if (err) return log.error(err.message);
                        res.send(204, "File Upload Complete");
                        log.info("save file %s - OK", filePath);
                    })

                }
            });
        }
    });
}

module.exports.SaveFile = function(req, res, next) {
    var query = req.params;
    var data = new Buffer('');
    req.on('data', function(chunk) {
        data = Buffer.concat([data, chunk]);
    });

    req.on('end', function() {
       // req.rawBody = data;
        saveToFile(data, query, res);
    });

    req.on('error', function(err) {
        log.error('problem with request: ' + err.message);
        req.send(500, 'Problem with request');
    });
    res.on('close', function () {
        // TODO удалить буфер
    });
};