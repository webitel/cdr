/**
 * Created by i.navrotskyj on 19.03.2015.
 */

var express = require('express');
var path = require('path');
var log = require('./libs/log')(module);
var config = require('./config');
var bodyParser = require('body-parser');
var fs = require('fs');

require('./middleware/cdrToElastic');

var app = express();

app.set('port', config.get('server:port'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//parse application/json
app.use(bodyParser.json({ extended: true }));

// Enables CORS
var enableCORS = function(req, res, next) {
    // TODO :)
    res.setHeader( 'X-Powered-By', 'Webitel CDR server' );
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Access-Token, X-Key');

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
    res.json({
        "status": "error",
        "info": req.originalUrl + ' not found.'
    });
    return;
});

app.use(function(err, req, res, next){
    res.status(err.status || 500);
    res.json({
        "status": "error",
        "info": err.message
    });
    return;
});

var useSSL = config.get('ssl:enabled').toString() == 'true';
if (useSSL) {
    var key = fs.readFileSync(config.get('ssl:key'));
    var cert = fs.readFileSync(config.get('ssl:cert'));
    var https = require('https');
    var https_options = {
        key: key,
        cert: cert
    };
    var httpsServer = https.createServer(https_options, app).listen(config.get("ssl:port"), function() {
        log.info('Express server (https) listening host ' + httpsServer.address().address + ' on port ' + httpsServer.address().port);
    });
} else {
    var http = require('http');
    var srvPublic = http.createServer(app).listen(config.get("ssl:port"), function() {
        log.info('Express server (http) listening host ' + srvPublic.address().address + ' on port ' + srvPublic.address().port);
    });
};
var httpServer = app.listen(config.get("server:port"), function() {
    log.info('Express server (http) listening host ' + httpServer.address().address + ' on port ' + httpServer.address().port);
});