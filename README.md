cdr-server
===

[![Build Status](https://dev.webitel.com/buildStatus/icon?job=build_cdr)](https://dev.webitel.com/job/build_cdr)

CDR & File Server for Webitel

## Default ports

`10021/tcp` - http port for call record file uploading from [FreeSWITCH](https://registry.hub.docker.com/u/webitel/freeswitch/)

`10023/tcp` - https port for REST API and file downloading

## Environment Variables

The CDR image uses several environment variables

### Server variables

`SSL` - enable https (default: false)

`MONGODB_HOST` - MongoDB host or IP

`TOKEN_KEY` - application token key for storing session

### Storage variables

`STORAGE_TRANSPORT`

- s3 - Amazon S3 storage
- file - Local file storage (default)

`STORAGE_ROOT` - storage root (default: /recordings)

`S3_KEY_ID` and `S3_KEY_SECRET`

`S3_REGION` - S3 Region

`ACL_UPLOAD` - Allowed IPs for call record file uploading (default: 0.0.0.0/0)

### Logs

`LOGLEVEL` - log level (default: warn)

`LOGSTASH_ENABLE` - send logs to Logstash Server (default: false)

`LOGSTASH_HOST` - Logstash host or IP


## Supported Docker versions

This image is officially supported on Docker version `1.3.2` and newest.

## User Feedback

### Issues
If you have any problems with or questions about this image, please contact us through a [GitHub issue](https://github.com/webitel/cdr/issues).
