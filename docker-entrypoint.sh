#!/bin/bash
set -e

if [ "$SSL" ]; then
	sed -i 's/SSL/'$SSL'/g' /cdr/config/config.json
else
	sed -i 's/SSL/false/g' /cdr/config/config.json
fi

if [ "$STORAGE" ]; then
	sed -i 's/STORAGE/'$STORAGE'/g' /cdr/config/config.json
else
	sed -i 's/STORAGE/file/g' /cdr/config/config.json
fi

if [ "$ACL_UPLOAD" ]; then
	sed -i 's/ACL_UPLOAD/'$ACL_UPLOAD'/g' /cdr/config/config.json
else
	sed -i 's/ACL_UPLOAD/0.0.0.0\/0/g' /cdr/config/config.json
fi

if [ "$REDIS_HOST" ]; then
	sed -i 's/REDIS_HOST/'$REDIS_HOST'/g' /cdr/config/config.json
fi

if [ "$MONGODB_HOST" ]; then
	sed -i 's/MONGODB_HOST/'$MONGODB_HOST'/g' /cdr/config/config.json
fi

if [ "$LOGLEVEL" ]; then
	sed -i 's/LOGLEVEL/'$LOGLEVEL'/g' /cdr/config/config.json
else
	sed -i 's/LOGLEVEL/warn/g' /cdr/config/config.json
fi

if [ "$LOGSTASH" ]; then
	sed -i 's/LOGSTASH/'$LOGSTASH'/g' /cdr/config/config.json
else
	sed -i 's/LOGSTASH/false/g' /cdr/config/config.json
fi

if [ "$LOGSTASH_HOST" ]; then
	sed -i 's/LOGSTASH_HOST/'$LOGSTASH_HOST'/g' /cdr/config/config.json
fi

if [ "$TOKEN_KEY" ]; then
	sed -i 's/TOKEN_KEY/'$TOKEN_KEY'/g' /cdr/config/config.json
fi

if [ "$S3_KEY_ID" ]; then
	sed -i 's/S3_KEY_ID/'$S3_KEY_ID'/g' /cdr/config/config.json
fi

if [ "$S3_KEY_SECRET" ]; then
	sed -i 's/S3_KEY_SECRET/'$S3_KEY_SECRET'/g' /cdr/config/config.json
fi

if [ "$1" = 'cdr' ]; then
	exec node app.js
fi

exec "$@"