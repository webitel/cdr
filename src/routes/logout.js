var HttpError = require('../error').HttpError;
var log = require('../libs/log')(module);

exports.post = function (req, res) {
    var user = req.session.user;
    req.session.destroy(function() {
        log.info('user %s logout', user);
        res.json({
            logout: "OK"
        });
    });
};