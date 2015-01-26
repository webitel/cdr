FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION 3.0.5014

COPY src /cdr
COPY LICENSE /
COPY docker-entrypoint.sh /

WORKDIR /cdr
RUN npm install && npm cache clear

VOLUME ["/cdr/cert", "/recordings", "/logs"]

EXPOSE 10021 10023

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["cdr"]