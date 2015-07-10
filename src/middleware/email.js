/**
 * Created by i.n. on 09.07.2015.
 */

var log = require('../libs/log')(module),
    conf = require('../config'),
    EmailCollectionName = conf.get('cdrDB:collectionEmail'),
    nodemailer = require('nodemailer'),
    smtpPool = require('nodemailer-smtp-pool'),
    db = require('../libs/mongoDrv');

var Provider = {
    "smtp": smtpPool
};

var EmailController = {
    send: function (mailOption, domain, cb) {
        try {
            if (!domain) {
                cb(new Error("Domain required."));
                return;
            };

            var collection = db.getCollection(EmailCollectionName);
            collection.findOne({"domain": domain}, function (err, res) {
                if (err) {
                    return cb(err);
                };

                if (typeof Provider[res.provider] != 'function') {
                    return cb(new Error('Bad provider name.'));
                };

                if (!res || !res['options']) {
                    return cb(new Error("Not settings EMail provider from domain " + domain));
                };
                mailOption['from'] = mailOption['from'] || res['from'];
                try {
                    var transporter = nodemailer.createTransport(Provider[res.provider](res['options']));
                    transporter.sendMail(
                        mailOption,
                        cb
                    );
                } catch (e) {
                    return cb(e);
                };
            });

        } catch (e) {
            log.error(e);
            cb(e);
            return;
        };
    }
};

module.exports = EmailController;