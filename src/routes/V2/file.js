/**
 * Created by i.navrotskyj on 27.02.2015.
 */

var Transport = require('../../middleware/transport');
var transport = new Transport();

module.exports = {
    getResource: function (req, res, next) {
        try {
            transport.GetFile(req, res, next);
        } catch (e) {
            next(e);
        }
    },

    deleteResource: function (req, res, next) {
        try {
            transport.DelFile(req, res, next);
        } catch (e) {
            next(e);
        }
    }
};