var elasticsearch = require('elasticsearch');

module.exports = function (config) {
    var client = new elasticsearch.Client({
        host: config.host
    });
    return client;
};