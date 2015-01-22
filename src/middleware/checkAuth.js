var jwt = require('jwt-simple'),
    validateUser = require('../routes/auth').validateUser,
    config = require('../config'),
    tokenSecretKey = config.get('application:auth:tokenSecretKey');

module.exports = function(req, res, next) {

    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];

    if (token && key) {
        try {
            var decoded = jwt.decode(token, tokenSecretKey);

            if (decoded.exp <= Date.now()) {
                res.status(400);
                res.json({
                    "status": 400,
                    "message": "Token Expired"
                });
                return;
            }

            // Authorize the user to see if s/he can access our resources

            validateUser(key, function (err, dbUser) {
                if (dbUser && dbUser.token == token) {
                    req.webitelDomain = dbUser['domain'];
                    next(); // To move to next middleware
                } else {
                    // No user with this name exists, respond back with a 401
                    res.status(401);
                    res.json({
                        "status": 401,
                        "message": "Invalid User"
                    });
                    return;
                }
            });

        } catch (err) {
            res.status(500);
            res.json({
                "status": 500,
                "message": "Oops something went wrong",
                "error": err
            });
        }
    } else {
        res.status(401);
        res.json({
            "status": 401,
            "message": "Invalid Token or Key"
        });
        return;
    }
};