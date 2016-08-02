/**
 * Created by igor on 15.04.16.
 */


var elasticsearch = require('elasticsearch'),
    checkPermission = require('../middleware/acl'),
    log = require('../libs/log')(module),
    config = require('../config').get('elastic'),
    setCustomAttribute = require('../utils/cdr').setCustomAttribute
    ;

const CDR_NAME = 'cdr*',
    MAX_RESULT_WINDOW = 2147483647;

var elastic = new elasticsearch.Client({
    host: config.host,
    requestTimeout: config.requestTimeout
});

function setIndexSettings() {
    elastic.indices.putSettings({
        index: CDR_NAME,
        body: {
            max_result_window: MAX_RESULT_WINDOW
        }
    }, (err, res) => {
        if (err)
            return log.error(err);

        log.info(`Set default max_result_window - success`);
    });
}

(function getSettings() {
    elastic.indices.getSettings({
        index: CDR_NAME,
        name: "index.max_result_window"
    }, (err, res) => {
        if (err) {
            setTimeout(getSettings, 2000);
            return log.error(err);
        }

        let indexName = Object.keys(res);
        if (indexName.length > 0) {
            let indexSettings = res[indexName[0]] && res[indexName[0]].settings;
            let max_result_window = +(indexSettings && indexSettings.index && indexSettings.index.max_result_window);

            if (!max_result_window || max_result_window < 1000000) {
                setIndexSettings()
            } else {
                log.trace('Skip set max_result_window')
            }
        } else {
            setIndexSettings();
        }
    });
})();

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
        var sort = (option.sort && Object.keys(option.sort).length > 0) ? option.sort : {"Call start time":{"order":"desc","unmapped_type":"boolean"}};

        elastic.search(
            {
                index: `cdr-*${caller.domain ? '-' + caller.domain : '' }`,
                size: limit,
                // scroll: '30s',
                //ignoreUnavailable: true,
                //allowNoIndices: true,

                _source: columns,
                fields: columns,
                //q: query,
                from: pageNumber > 0 ? ((pageNumber - 1) * limit) : 0, //Number — Starting offset (default: 0)
                body: {
                    "fielddata_fields": columnsDate,
                    "sort": [sort],
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
    },
    
    _insert: function (doc, cb) {
        let currentDate = new Date();
        let indexName = 'cdr' + '-' + (currentDate.getMonth() + 1) + '.' + currentDate.getFullYear();
        let _record = setCustomAttribute(doc);
        let _id = _record._id.toString();
        delete _record._id;
        elastic.create({
            index: (indexName + (doc.variables.domain_name ? '-' + doc.variables.domain_name : '')).toLowerCase(),
            type: 'collection',
            id: _id,
            body: _record
        }, cb);

    }
};