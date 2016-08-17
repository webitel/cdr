var log = require('../libs/log')(module),
    url = require('url'),
    downloadAcl = require('../middleware/uploadAcl'),
    saveTypeFile = require('../config').get('recordFile:transport'),
    saveCdr = require('../middleware/saveCdr').post;

var Transport = require('../middleware/transport');
var transport = new Transport();

module.exports = function (app) {
    app.use(function(req, res, next) {
        log.trace('Method: %s, url: %s, path: %s', req.method, req.url, req.path);
        next();
    });

    // SYSTEM

    // /sys/formLoadFile?domain=10.10.10.144&&id=test&&format=mp3
    app.put('/sys/formLoadFile?:id', downloadAcl, function (req, res, next) {
        transport.SaveFile(req, res, next, saveTypeFile);
    });

    app.post('/sys/cdr', downloadAcl, saveCdr);
    app.get('/sys/tts/:provider', require('../middleware/tts'));

    // For ACR
    app.get('/sys/media/:type/:id', downloadAcl, require('../middleware/media').stream);

    app.get('/sounds/:id', require('../middleware/soundsResource').GetFile);

    require('./V1')(app);

    // API V2
    require('./V2')(app);

};