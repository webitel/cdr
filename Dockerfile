FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION 3.0.5013

COPY src /cdr

WORKDIR /cdr
RUN npm install && npm cache clear

VOLUME ["/cdr/config", "/cdr/cert", "/recordings", "/logs"]

ENTRYPOINT ["node", "app.js"]

EXPOSE 10021 10023