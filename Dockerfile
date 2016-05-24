FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION
ENV WEBITEL_MAJOR 3.3
ENV WEBITEL_REPO_BASE https://github.com/webitel

COPY src /cdr
COPY LICENSE /
COPY docker-entrypoint.sh /

WORKDIR /cdr
RUN npm install && npm cache clear

EXPOSE 10021 10023
ENTRYPOINT ["/docker-entrypoint.sh"]
