/**
 * Created by igor on 02.08.16.
 */

"use strict";
    
const exportFn = require('../middleware/cdrToElastic').initExportProcess;

let time = null;

for (let arg of process.argv) {
    if (/^--time=/.test(arg)) {
        time = +arg.replace(/\D/gi, '');
        break;
    }
}

exportFn(time);