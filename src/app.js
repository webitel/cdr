var express = require('express');
var path = require('path');
var log = require('./libs/log')(module);
var config = require('./config');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var app = express();
//app.disable('x-powered-by');

app.set('port', config.get('port'));

app.use(cookieParser(config.get('session:cookie:cookieSecret')));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
//
app.use(bodyParser({ uploadDir: path.join(__dirname, 'files'), keepExtensions: true }));
//parse application/json
app.use(bodyParser.json());
//
app.use(methodOverride());

var RedisStore = require('connect-redis')(expressSession);
var redisOption = {
    host: 'localhost',
    port: 6379
}
var sessionOption = {
    secret: config.get("session:secret"),
    key: config.get("session:key"),
//    store: new RedisStore(redisOption),
    cookie: {
        path     : '/',
        domain   : '10.10.10.25',
        httpOnly : config.get('session:cookie:httpOnly'),
        maxAge   : config.get('session:cookie:maxAge')
    }
}

app.use(expressSession(sessionOption));

//app.use(function(req, res, next) {
//    res.header('Access-Control-Allow-Credentials', true);
//    res.header('Access-Control-Allow-Origin',      req.headers.origin);
//    res.header('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE');
//    res.header('Access-Control-Allow-Headers',     'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
//    next();
//});
//app.use(setControl);


// Enables CORS
var enableCORS = function(req, res, next) {
    // TODO :)
    //res.setHeader( 'X-Powered-By', 'Webitel CDR server' ); //
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    //res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};
// enable CORS!
app.use(enableCORS);

require('./routes')(app);

app.use(function(req, res, next){
    res.status(404);
    res.send({ error: 'Not found' });
    return;
});

app.use(function(err, req, res, next){
    res.status(err.status || 500);
    res.send({ error: err.message });
    return;
});

var server = app.listen(app.get('port'), function() {
    log.info('Express server listening on port ' + server.address().port);
});