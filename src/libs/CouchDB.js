var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'http://10.10.10.25:5984/cdr/_design/cdr/_view/test_view',
    log: 'trace'
});

client.search({
  //  index: 'twitter',
   // type: 'tweets',
    body: {
        query: {
            match: {
                body: 'elasticsearch'
            }
        }
    }
}).then(function (resp) {
        var hits = resp.hits.hits;
        console.trace(hits);
    }, function (err) {
        console.trace(err.message);
    });










/*
var cradle = require('cradle');
var connect = new(cradle.Connection)('http://10.10.10.25', 5984, {
    cache: true,
    raw: false
});
var db = connect.database('cdr');

db.view('cdr/test_view',  {
        descending: true,
        startkey: {1: "1409921684388506"},
        endkey: {1: "1409925207908515"}
    },
    function (err, res) {
    res.forEach(function (key, row, id) {
        console.log('key = %s; id = %s', key, id);
    });
});*/