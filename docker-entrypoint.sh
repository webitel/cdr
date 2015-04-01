#!/bin/bash
set -e

echo 'Webitel CDR Server '$VERSION

if [ "$SSL" ]; then
	sed -i 's/SSL/'$SSL'/g' /cdr/config/config.json
else
	sed -i 's/SSL/false/g' /cdr/config/config.json
fi

if [ "$STORAGE_TRANSPORT" ]; then
	sed -i 's/STORAGE_TRANSPORT/'$STORAGE_TRANSPORT'/g' /cdr/config/config.json
else
	sed -i 's/STORAGE_TRANSPORT/file/g' /cdr/config/config.json
fi

if [ "$STORAGE_ROOT" ]; then
	sed -i 's/STORAGE_ROOT/'$STORAGE_ROOT'/g' /cdr/config/config.json
else
	sed -i 's/STORAGE_ROOT/recordings/g' /cdr/config/config.json
fi

if [ "$ACL_UPLOAD" ]; then
	sed -i 's/ACL_UPLOAD/'$ACL_UPLOAD'/g' /cdr/config/config.json
else
	sed -i 's/ACL_UPLOAD/0.0.0.0\/0/g' /cdr/config/config.json
fi

if [ "$MONGODB_HOST" ]; then
	sed -i 's/MONGODB_HOST/'$MONGODB_HOST'/g' /cdr/config/config.json
fi

if [ "$LOGLEVEL" ]; then
	sed -i 's/LOGLEVEL/'$LOGLEVEL'/g' /cdr/config/config.json
else
	sed -i 's/LOGLEVEL/warn/g' /cdr/config/config.json
fi

if [ "$LOGSTASH_ENABLE" ]; then
	sed -i 's/LOGSTASH_ENABLE/'$LOGSTASH_ENABLE'/g' /cdr/config/config.json
else
	sed -i 's/LOGSTASH_ENABLE/false/g' /cdr/config/config.json
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

sed -i 's/S3_REGION/'$S3_REGION'/g' /cdr/config/config.json

exec node app.js