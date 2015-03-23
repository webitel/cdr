var inSubnet = require('insubnet')
    ,config = require('../config')
    ,log = require('../libs/log')(module);

var requestIp = require('request-ip');

module.exports = function (req, res, next) {
    var ip = getClientIp(req);
    if (ip) {
        ip = ip.replace(/^::ffff:/, '');
    };
    var mode = config.get("uploadAcl:mode");
    var ips =config.get("uploadAcl:ip");

    if (mode === 'allow' && inSubnet.Auto(ip, ips)) {
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
    return requestIp.getClientIp(req);
};

