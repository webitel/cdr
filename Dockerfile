FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

ENV VERSION 3.0 <%= `git rev-parse --short HEAD`.strip %>

COPY src /cdr

VOLUME ["/cdr/config", "/cdr/cert", "/recordings", "/logs"]

WORKDIR /cdr
ENTRYPOINT ["node", "app.js"]

EXPOSE 10021 10023
