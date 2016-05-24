cdr-server
===

[![Build Status](https://travis-ci.org/webitel/cdr.svg?branch=master)](https://travis-ci.org/webitel/cdr)

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

`LOGLEVEL` - log level (default: warn)


## Supported Docker versions

This image is officially supported on Docker version `1.10` and newest.

## User Feedback

### Issues
If you have any problems with or questions about this image, please contact us through a [Jira](https://my.webitel.com/).
