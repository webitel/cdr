var inSubnet = require('insubnet')
    ,config = require('../config')
    ,log = require('../libs/log')(module);

module.exports.acl = function (req, res, next) {
    var ip = getClientIp(req);
    var mode = config.get("downloadAclList:mode");
    var ips =config.get("downloadAclList:ip");

    if (mode === 'allow' && inSubnet.IPv4(ip, ips)) {
        next()
    } else {
        log.warn('Unauthorized connection ip: %s', ip);
        res.statusCode = 401;
        return res.end('forbidden');
    }
};

var getClientIp = function(req) {
    var ipAddress;

    var forwardedIpsStr = req.headers['x-forwarded-for'];

    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }

    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }

    if(!ipAddress){
        return "";
    }

    if(ipAddress.indexOf(':') !== -1){
        ipAddress = ipAddress.split(':')[0];
    }

    return ipAddress;
};

