// Include the cluster module
var cluster = require('cluster'),
    log = require('./libs/log')(module),
    crashCount = 1;

// Code to run if we're in the master process
if (cluster.isMaster) {

    cluster.fork();

    // Listen for dying workers
    cluster.on('exit', function (worker) {

        // Replace the dead worker, we're not sentiment
        log.error('Worker ' + worker.id + ' died.');
        cluster.fork({
            "CRASH_WORKER_COUNT": (crashCount++)
        });
    });

// Code to run if we're in a worker process
} else {
    require('./worker');
    log.info('Worker ' + cluster.worker.id + ' running!');
}