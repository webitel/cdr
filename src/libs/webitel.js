var HttpError = require('../error').HttpError;
var log = require('../libs/log')(module);

exports.login = function (login, password, callback) {
    if (login == 'igor') {
        callback(null, login);
    } else {
        log.warn("403: User not found");
        callback(new HttpError(403, "User not found"), null);
    }
};