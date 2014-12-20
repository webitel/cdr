var HttpError = require('../error').HttpError;
var log = require('../libs/log')(module);
var url = require('url');

module.exports.get = function (req, res, next) {
    if (1==2 && !req.session.user) {
        log.warn('403: user unauthorized');
        return next(new HttpError(403));
    }
    return next();
};