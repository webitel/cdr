cdr-server
===

CDR & File Server for Webitel


## Environment Variables

The CDR image uses several environment variables

### Server variables

`SSL` - enable https (default: false)

`REDIS_HOST` - Redis host or IP

`REDIS_DB` - Redis DB index (default: 0)

`MONGODB_HOST` - MongoDB host or IP

`TOKEN_KEY` - application token key for storing session

### Storage variables

`STORAGE` - storage transport:

- s3 - Amazon S3 storage
- file - Local file storage (default)

`STORAGE_ROOT` - storage root (default: /recordings)

`S3_KEY_ID` and `S3_KEY_SECRET`

`ACL_UPLOAD` - Allowed IPs for call records file uploading (default: 0.0.0.0/0)

### Logs

`LOGLEVEL` - log level (default: warn)

`LOGSTASH` - send logs to Logstash Server (default: false)

`LOGSTASH_HOST` - Logstash host or IP


## Supported Docker versions

This image is officially supported on Docker version `1.4` and newest.

## User Feedback

### Issues
If you have any problems with or questions about this image, please contact us through a [GitHub issue](https://github.com/webitel/cdr/issues).
