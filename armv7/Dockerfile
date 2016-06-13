FROM armv7/armhf-debian
MAINTAINER Vitaly Kovalyshyn "v.kovalyshyn@webitel.com"

RUN apt-get update && apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV VERSION
ENV WEBITEL_MAJOR 3.1
ENV WEBITEL_REPO_BASE https://github.com/webitel

COPY src /cdr
COPY LICENSE /
COPY docker-entrypoint.sh /

WORKDIR /cdr
RUN npm install && npm cache clear

EXPOSE 10021 10023
ENTRYPOINT ["/docker-entrypoint.sh"]
