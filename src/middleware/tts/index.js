/**
 * Created by igor on 16.08.16.
 */

"use strict";

const https = require('https'),
    log = require('../../libs/log')(module),
    aws = require('./aws4')
    ;
    
module.exports = (req, res, next) => {
    let provider = req.params.provider;
    if (PROVIDERS.hasOwnProperty(provider) && PROVIDERS[provider] instanceof Function) {
        return PROVIDERS[provider](req, res, next);
    } else {
        log.warn(`Bad provider name ${provider}`);
        res.status(400).end();
    }
};

const PROVIDERS = {
    ivona: (req, res, next) => {

        let voiceSettings = {
            Input: {
                Data : req.query.text,
                Type : 'text/plain'
            },
            OutputFormat: {
                Codec : 'MP3',
                SampleRate : 22050
            },
            Parameters: {
                Rate : 'medium',
                Volume : 'medium',
                SentenceBreak : 500,
                ParagraphBreak : 650
            },
            Voice: {
                Name : req.query.name || 'Salli',
                Language : req.query.language || 'en-US',
                Gender : req.query.gender || 'Female'
            }
        };

        let requestParams = {
            path: `/CreateSpeech`,
            host: 'tts.eu-west-1.ivonacloud.com',
            service: 'tts',
            method: 'POST',
            region: 'eu-west-1',
            body: JSON.stringify(voiceSettings)
        };

        aws.sign(requestParams, {accessKeyId: req.query.key, secretAccessKey: req.query.token});

        return _sendRequest(requestParams, res);
    },
    microsoft: (req, res, next) => {
        let keyId = req.query.key1,
            keySecret = req.query.key2,
            appId = req.query.appId;

        microsoftAccessToken(keyId, keySecret, 'https://speech.platform.bing.com', (err, token) => {
            if (err || (!token || !token.access_token))
                return res.status(500).send('Bad response');

            let voice = {
                gender: req.query.gender || 'Female',
                lang: req.query.language || 'en-US'
            };

            let requestParams = {
                path: `/synthesize`,
                host: 'speech.platform.bing.com',
                method: 'POST',
                headers: {
                    'X-Search-AppId': appId,
                    'X-Search-ClientID': keyId,
                    'X-Microsoft-OutputFormat': 'riff-8khz-8bit-mono-mulaw',
                    'Authorization': `Bearer ${token.access_token}`,
                    'User-Agent': 'WebitelACR',
                    'Content-Type': 'audio/wav; samplerate=8000'
                },
                body: `<speak version='1.0' xml:lang='${voice.lang}'>
                        <voice xml:lang='${voice.lang}' xml:gender='${voice.gender}' name='Microsoft Server Speech Text to Speech Voice (${microsoftLocalesNameMaping(voice.lang, voice.gender)})'>${req.query.text}
                        </voice>
                      </speak>`

            };

            return _sendRequest(requestParams, res);

        });
    }
};

function _sendRequest(requestParams, res) {
    let request = https.request(requestParams, (responseTTS) => {
        return _handleResponseTTS(responseTTS, res);
    });
    request.on('error', (error) => {
        log.error(error);
    });

    if (requestParams.body) request.write(requestParams.body);
    request.end();
}

function _handleResponseTTS(responseTTS, res) {
    log.trace(`response TTS status code: ${responseTTS.statusCode}`);
    responseTTS.on('error', (error) => {
        log.error(error);
    });

    if (responseTTS.statusCode !== 200) {
        log.error(responseTTS.headers);
        return res.status(responseTTS.statusCode).send('Bad response');
    }
    responseTTS.pause();
    res.writeHeader(responseTTS.statusCode, responseTTS.headers);
    responseTTS.pipe(res);
    responseTTS.resume();
}

function microsoftAccessToken(clientId, clientSecret, service, cb) {
    let requestParams = {
        path: `/token/issueToken`,
        host: 'oxford-speech.cloudapp.net',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=${service}`
    };
    let data = '';

    let request = https.request(requestParams, (res) => {
        log.trace(`response microsoft auth status code: ${res.statusCode}`);

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function() {
            try {
                cb(null, JSON.parse(data));
            } catch (e) {
                log.error(e);
                cb(e);
            }
        });

        res.once('error', cb);

    });
    request.once('error', cb);

    if (requestParams.body) request.write(requestParams.body);
    request.end();
}

const GENDER_FEMALE = 'Female';
function microsoftLocalesNameMaping(locale, gender) {
    switch (locale) {
        case 'ar-EG':
            return "ar-EG, Hoda";

        case 'de-DE':
            if (isFemale(gender))
                return "de-DE, Hedda";
            else return "de-DE, Stefan, Apollo";

        case 'en-AU':
            return "en-AU, Catherine";
        case 'en-CA':
            return "en-CA, Linda";

        case 'en-GB':
            if (isFemale(gender))
                return "en-GB, Susan, Apollo";
            else return "en-GB, George, Apollo";

        case 'en-IN':
            return "en-IN, Ravi, Apollo";

        case 'en-US':
            if (isFemale(gender))
                return "en-US, ZiraRUS";
            else return "en-US, BenjaminRUS";

        case 'es-ES':
            if (isFemale(gender))
                return "es-ES, Laura, Apollo";
            else return "es-ES, Pablo, Apollo";

        case 'es-MX':
            return "es-MX, Raul, Apollo";

        case 'fr-CA':
            return "fr-CA, Caroline";

        case 'fr-FR':
            if (isFemale(gender))
                return "fr-FR, Julie, Apollo";
            else return "fr-FR, Paul, Apollo";

        case 'it-IT':
            return "it-IT, Cosimo, Apollo";

        case 'ja-JP':
            if (isFemale(gender))
                return "ja-JP, Ayumi, Apollo";
            else return "ja-JP, Ichiro, Apollo";

        case 'pt-BR':
            return "pt-BR, Daniel, Apollo";

        case 'ru-RU':
            if (isFemale(gender))
                return "pt-BR, Daniel, Apollo";
            else return "ru-RU, Pavel, Apollo";

        case 'zh-CN':
            if (isFemale(gender))
                return "zh-CN, Yaoyao, Apollo";
            else return "zh-CN, Kangkang, Apollo";

        case 'zh-HK':
            if (isFemale(gender))
                return "zh-HK, Tracy, Apollo";
            else return "zh-HK, Danny, Apollo";

        case 'zh-TW':
            if (isFemale(gender))
                return "zh-TW, Yating, Apollo";
            else return "zh-TW, Yating, Apollo";

        default:
            log.error(`unknown local: ${locale}`);
            return "";

    }
}

function isFemale(gender) {
    return GENDER_FEMALE == gender;
}