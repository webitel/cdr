/**
 * Created by i.navrotskyj on 27.02.2015.
 */

var cdr = require('./cdr'),
    file = require('./file');

module.exports = function (app) {
    app.all('/api/v2/*', [require('../../middleware/checkAuth')]);

    // Leg A
    app.get ('/api/v2/cdr', cdr.showGetList);
    app.post('/api/v2/cdr/searches', cdr.showPostList);
    app.post('/api/v2/cdr/counts', cdr.showListACount);
    app.post('/api/v2/cdr/aggregates', cdr.aggregate);

    // Leg B
    app.post('/api/v2/cdr/b/searches', cdr.showListB);

    // File CDR
    app.get('/api/v2/files/:id', file.getResource);
    app.delete('/api/v2/files/:id', file.deleteResource);

    // Media IVR or user media
    app.get('/api/v2/media/:type?', require('../../middleware/media').get);
    app.get('/api/v2/media/:type/:id', require('../../middleware/media').stream);
    app.post('/api/v2/media/searches', require('../../middleware/media').searches);
    app.post('/api/v2/media/:type?', require('../../middleware/media').post);
    app.post('/api/v2/media/local', require('../../middleware/media').postLocal);
    app.delete('/api/v2/media/:type/:name', require('../../middleware/media').delRecord);

    app.put('/api/v2/media/:type/:id', require('../../middleware/media').put);

};