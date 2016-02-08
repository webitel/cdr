/**
 * Created by i.navrotskyj on 21.01.2016.
 */
'use strict';


module.exports = function checkPermission (acl, resource, action, ignoreAllPerm) {
    if (!acl || !resource || !action || !(acl[resource] instanceof Array))
        return false;

    if (ignoreAllPerm)
        return !!~acl[resource].indexOf(action) && !~acl[resource].indexOf('*');

    return !!~acl[resource].indexOf(action) || !!~acl[resource].indexOf('*');
}