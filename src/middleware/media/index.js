/**
 * Created by i.navrotskyj on 16.03.2015.
 */

var USER_ROLE = require('../../const').USER_ROLE,
    db = require('./db'),
    formidable = require('formidable'),
    conf = require('../../config'),
    fs = require('fs-extra'),
    log = require('../../libs/log')(module),
    UPLOAD_DIR = conf.get('mediaFile:fileRoot'),
    MAX_FILE_SIZE = conf.get('mediaFile:maxFieldsSizeMB') || 2;

module.exports = {
    get: function (req, res, next) {
        var _user = req.webitelUser,
            _type = req.params['type'];
        if (_user.attr['role']['val'] < USER_ROLE.ADMIN) {
            res.status(403).json({
                "status": "error",
                "info": "Forbidden!"
            });
            return;
        };

        var query = req.query,
            limit = query['limit'],
            page = query['page'],
            domainName = _user.attr['domain'] || req.query['domain'],
            filter = {};

        if (!domainName && (_type && _type === 'mp3')) {
            res.status(400).json({
                "status": "error",
                "info": "Domain or type required!"
            });
            return;
        };

        if (_type) {
            filter['type'] = _type;
        };

        var option = {
            columns: {},
            filter: filter,
            limit: limit,
            pageNumber: page,
            sort: {},
            domain: domainName
        };

        db.searches(option, function (err, data) {
            if (err) return next(err);
            res.json({
                "status": "OK",
                "data": data
            });
        });
    },

    searches: function (req, res, next) {
        var _user = req.webitelUser;
        if (_user.attr['role']['val'] < USER_ROLE.ADMIN) {
            res.status(403).json({
                "status": "error",
                "info": "Forbidden!"
            });
            return;
        };

        var option = {
            columns: req.body.columns,
            filter: req.body.filter,
            limit: req.body.limit,
            pageNumber: req.body.pageNumber,
            sort: req.body.sort,
            domain: _user.attr['domain']
        };

        db.searches(option, function (err, data) {
            if (err) return next(err);
            res.json({
                "status": "OK",
                "data": data
            });
        });

    },
    
    postLocal: function (req, res, next) {
        var _user = req.webitelUser;
        if (_user.attr['role']['val'] < USER_ROLE.ROOT) {
            res.status(403).json({
                "status": "error",
                "info": "Forbidden!"
            });
            return;
        };

        var data = req.body,
            _response = {
                "status": "OK",
                "errors": [],
                "inserted": []
            };
        if (Object.keys(data).length < 1) {
            res.status(400).json({
                "status": "error",
                "info": "Bar request!"
            });
            return;
        };
        
        if (data instanceof Array) {
            data.forEach(function (item) {
                return item['type'] = 'local';
            });
        } else {
            data['type'] = 'local';
        };

        db.insert(data, function (err, result) {
            if (err) {
                _response.status = "error";
                _response.errors.push(err.errmsg);
            } else {
                _response.inserted.push(result);
            };
            res.status(200).json(_response);
        });
    },

    delRecord: function (req, res, next) {
        try {
            var _user = req.webitelUser;
            if (_user.attr['role']['val'] < USER_ROLE.ROOT) {
                res.status(403).json({
                    "status": "error",
                    "info": "Forbidden!"
                });
                return;
            };
            var type = req.params['type'],
                name = req.params['name'],
                domain = _user.attr['domain'] || req.query['domain'],
                path = UPLOAD_DIR + domain
                ;
            if (!type || !name || !domain) {
                res.status(400).json({
                    "status": "error",
                    "info": "Bad request"
                });
                return;
            };

            db.deleteFromName(name, domain, type, function (err, result) {
                if (err) {
                    res.status(500).json({
                        "status": "error",
                        "info": err["message"]
                    });
                    return;
                };
                if (result > 0) {
                    try {
                        fs.remove(path + '/' + name);
                        res.status(200).json({
                            "status": "OK",
                            "info": "Remove " + result + " record."
                        });
                    } catch (e) {
                        next(e);
                    };
                } else {
                    res.status(404).json({
                        "status": "error",
                        "info": "Not found!"
                    });
                };
                return;
            });

        } catch (e) {
            next(e);
        };
    },
    
    post: function (req, res, next) {
        var _user = req.webitelUser,
            _type = req.params['type'] || 'mp3';
        if (_user.attr['role']['val'] < USER_ROLE.ADMIN) {
            res.status(403).json({
                "status": "error",
                "info": "Forbidden!"
            });
            return;
        };

        var domainName = _user.attr['domain'] || req.query['domain'];
        if (!domainName && (_type && _type === 'mp3')) {
            res.status(400).json({
                "status": "error",
                "info": "Domain required!"
            });
            return;
        };

        /*if (_user.attr['domain']) {
            _type = 'mp3';
        };*/

        if (req.headers['content-type'].match(/json/i)) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request!"
            });
            return;
        };

        var form = new formidable.IncomingForm(),
            path = UPLOAD_DIR + domainName,
            errorInfo;

        form.maxFieldsSize = MAX_FILE_SIZE * 1024 * 1024;

        form
            .on('error', function(err) {
                log.warn(err.message);
                errorInfo = err.message;
            })
            .on('end', function (result) {
                //res.send('OK');
            });

        form.parse(req, function (err, fields, files) {
            if (Object.keys(files).length < 1) {
                return res.status(400).json({
                    "status": "error",
                    "info": "No file!"
                });
            };

            var batch = db.bulkOp(),
                _response = {
                    "status": "OK",
                    "errors": [],
                    "inserted": []
                },
                _inserted = {};
            for (var key in files) {
                _inserted[files[key]['name']] = key;

                batch.insert({
                    "type": _type,
                    "name": files[key]['name'],
                    "domain": domainName,
                    "size": files[key]['size'],
                    "format": files[key]['type']
                });
            };

            batch.execute(function (err, result) {
                if (err) {
                    res.status(500).json({
                        "status": "error",
                        "info": err.message
                    });
                    return;
                };
                try {
                    var errorArray = result.getWriteErrors(),
                        _e;

                    for (var i = 0, len = errorArray.length; i < len; i++) {
                        _response['status'] = 'error';
                        _e = errorArray[i].toJSON();

                        fs.remove(files[_inserted[_e['op']['name']]].path);

                        delete _inserted[_e['op']['name']];

                        _response['errors'].push({
                            "name": _e['op']['name'],
                            "info": _e.errmsg
                        });
                    };

                    for (var key in _inserted) {
                        fs.move(files[_inserted[key]]['path'], path + '/' + key, function (err) {
                            if (err) {
                                log.error(err);
                            }
                        });
                    };
                    _response['inserted'] = Object.keys(_inserted);
                    if (errorInfo) {
                        _response['errors'].push({
                            "info": errorInfo
                        });
                    };
                    res.status(200).json(_response);
                } catch (e) {
                    next(e);
                }
            });
        });
    },
    
    put: function (req, res, next) {
        var _user = req.webitelUser,
            _type = req.params['type'];

        if (_user.attr['role']['val'] < USER_ROLE.ADMIN) {
            res.status(403).json({
                "status": "error",
                "info": "Forbidden!"
            });
            return;
        };

        var _id = req.params['id'],
            domainName = _user.attr['domain'] || req.query['domain'],
            _body = req.body,
            dbQuery = {
                "_id": _id,
                "domain": domainName
            },
            dbParam = {
                "$set": {}
            };

        for (var key in _body) {
            if (_body.hasOwnProperty(key) && typeof _body[key] === 'string') {
                dbParam['$set'][key] = _body[key];
            };
        };

        db.update(dbQuery, dbParam, function (err, result) {
            if (err) {
                return next(err);
            };

            if (_body.hasOwnProperty('name')) {
                try {
                    var path = UPLOAD_DIR + result['domain'] + '/';
                    fs.rename(path + result['name'], path + _body['name'], function (err) {
                        if (err) {
                            res.status(200)
                                .json({
                                    "status": "error",
                                    "info": err.message
                                });
                            return;
                        };

                        res.status(200).json({
                            "status": "OK",
                            "info": result
                        });
                    });
                } catch (e) {
                    next(e);
                };
            } else {
                res.status(200)
                    .json({
                        "status": "OK",
                        "info": result
                    });
            };
        });
    },
    
    stream: function (req, res, next) {
        var _user = req.webitelUser,
            _id = req.params['id'],
            _type = req.params['type'],
            domainName = _user.attr['domain'] || req.query['domain'],
            queryStream = req.query['stream']
            ;

        db.getOne(_id, domainName, _type, function (err, result) {
            if (err) {
                next(err);
                return;
            };
            if (!result) {
                next(new Error('Not found'));
                return;
            };

            var path = UPLOAD_DIR + result['domain'] + '/' + result['name'];

            fs.lstat(path, function (err, stat) {

                if (err) {
                    res.status(500).json({
                        "status": "error",
                        "info": err.message
                    });
                } else {
                    if (!stat.isFile()) return;

                    if (queryStream === "false") {
                        var stream = fs.createReadStream(path,
                            {
                                flags: 'r',
                                bufferSize: 8 * 1024
                            });
                        stream
                            .on('close', res.destroy.bind(res))
                            .on('error', res.destroy.bind(res))
                            .pipe(res)
                            .on('close', stream.destroy.bind(stream))
                            .on('error', stream.destroy.bind(stream));
                        return;

                    } else {

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
                            'Connection': 'close',
                            'Cache-Control': 'private',
                            'Content-Type': 'audio/mpeg',
                            'Content-Length': end - start,
                            'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
                            'Accept-Ranges': 'bytes',
                            'Transfer-Encoding': 'chunked'
                        });

                        var stream = fs.createReadStream(path,
                            {
                                flags: 'r',
                                start: start,
                                end: end,
                                bufferSize: 8 * 1024
                            });
                        stream
                            .on('close', res.destroy.bind(res))
                            .on('error', res.destroy.bind(res))
                            .pipe(res)
                            .on('close', stream.destroy.bind(stream))
                            .on('error', stream.destroy.bind(stream));

                    }

                };
            });
        });
    }
};