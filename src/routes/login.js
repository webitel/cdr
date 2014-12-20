var HttpError = require('../error').HttpError;
var log = require('../libs/log')(module);
var webitel = require('../libs/webitel');
var async = require('async');

exports.post = function (req, res, next) {
    var login = req.body.login;
    var pass = req.body.pass;
    var domain = req.body.domain;

    async.waterfall([
        function (callback) {
            webitel.login(login, pass, domain, callback);
        }
    ],
    function (err, user) {
        if (err) return next(err);
        req.session.user = user;
        log.info('user %s login', user);
        res.send({
            login: "OK"
        });
    });
};