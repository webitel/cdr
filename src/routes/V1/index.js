/**
 * Created by i.navrotskyj on 27.02.2015.
 */

var file = require('./file');

module.exports = function (app) {
/*
   app.post('/api/list'
   app.post('/api/aggregate'
   app.post('/api/listLegB'
   app.post('/api/listACount'
   app.get('/api/list'
   app.delete('/api/delFile?:id'
*/
    app.get('/api/getFile?:id', require('../../middleware/checkAuth'), function (req, res, next) {
        req.params['id'] = req.query['uuid'] || req.query['id'];
        file.getResource(req, res, next);
    });
};