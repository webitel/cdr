/**
 * Created by igor on 15.04.16.
 */


var elasticsearch = require('elasticsearch'),
    checkPermission = require('../middleware/acl'),
    config = require('../config').get('elastic')
    ;

var elastic = new elasticsearch.Client({
    host: config.host,
    requestTimeout: config.requestTimeout
});


module.exports = {
    get: function (caller, option, cb) {

        var acl = caller.acl,
            _ro = false
            ;

        var _readAll = checkPermission(acl, 'cdr', 'r');

        if (!_readAll && checkPermission(acl, 'cdr', 'ro', true)) {
            _ro = true;
        };
        if (!_ro && !_readAll) {
            return cb(new Error("Permission denied!"))
        };

        var filter = {
            "bool": {
                "must": [

                ],
                "must_not": []
            }
        };

        if (option.filter)
            filter.bool.must.push(option.filter);

        if (_ro)
            filter.bool.must.push({
                "term": {"variables.presence_id": caller.id}
            });
        var columns = option.columns;
        var columnsDate = option.columnsDate || [];
        var query = option.query || "*";
        var limit = parseInt(option.limit, 10) || 40;
        var pageNumber = option.pageNumber;
        var sort = option.sort;

        elastic.search(
            {
                index: `cdr-*${caller.domain ? '-' + caller.domain : '' }`,
                size: limit,
                scroll: '30s',
                //ignoreUnavailable: true,
                //allowNoIndices: true,

                _source: columns,
                fields: columns,
                //q: query,
                from: pageNumber > 0 ? ((pageNumber - 1) * limit) : 0, //Number — Starting offset (default: 0)
                body: {
                    "fielddata_fields": columnsDate,
                    "sort": [sort || {}],
                    "query": {
                        "filtered": {
                            "query": {
                                "query_string": {
                                    "analyze_wildcard": true,
                                    //"default_operator": "AND",
                                    "query": query
                                }
                            },
                            "filter": filter
                        },
                    },
                }
            },
            cb
        );
    }
}