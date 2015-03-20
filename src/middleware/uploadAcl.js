var inSubnet = require('insubnet')
    ,config = require('../config')
    ,log = require('../libs/log')(module);

module.exports = function (req, res, next) {
    var ip = getClientIp(req);
    var mode = config.get("uploadAcl:mode");
    var ips =config.get("uploadAcl:ip");

    if (mode === 'allow' && inSubnet.IPv4(ip, ips)) {
        req.webitelUser = {
            role: "GOD",
            attr: {}
        };
        next()
    } else {
        log.warn('Unauthorized connection ip: %s', ip);
        res.statusCode = 401;
        return res.end('forbidden');
    }
};

var getClientIp = function(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};

