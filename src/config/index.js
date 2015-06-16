var nconf = require('nconf');
var path = require('path');

//nconf
nconf.argv()
    .env()
    .add('elastic', {
        type: "file",
        file: path.join(__dirname, 'elastic.json')
    })
    .file({
        file: path.join(__dirname, 'config.json')
    })
;

module.exports = nconf;