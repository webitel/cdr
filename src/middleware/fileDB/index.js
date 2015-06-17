var db = require('../../libs/mongoDrv');

var dbFile = {
    insertFile: function (data, callback) {
        var dbFile = db.fileCollection;
        dbFile.save(data, {safe: true}, callback);
    },

    getRecordFile: function (uuid, callback) {
        var dbFile = db.fileCollection;
        dbFile.findOne({uuid: uuid}, callback);
    },



    getRecordFilesFromUuids: function (uuids, callback) {
        var dbFile = db.fileCollection;
        dbFile.find({
            uuid:{
                $in: uuids
            }
        }).toArray(callback);
    },

    removeFileDB: function (_id, callback) {
        var dbFile = db.fileCollection;
        try {
            dbFile.remove({_id: _id}, callback);
        } catch (e) {
            callback(e);
        }
    }
};

module.exports = dbFile;