FROM node:slim
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

COPY src /cdr

VOLUME ["/cdr/config", "/cdr/cert", "/recordings", "/logs"]

WORKDIR /cdr
ENTRYPOINT ["node", "app.js"]

EXPOSE 10021 10023
