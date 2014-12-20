module.exports.setControl = function (req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin',      req.headers.origin);
    res.header('Access-Control-Allow-Methods',     'GET,POST,PUT,OPTION');
    res.header('Access-Control-Allow-Headers',     'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
}