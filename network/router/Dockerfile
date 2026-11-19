FROM alpine:3.20

RUN apk add --no-cache iproute2 iptables curl

COPY setup_routing.sh /usr/local/bin/setup_routing.sh

RUN chmod +x /usr/local/bin/setup_routing.sh

CMD ["sh", "-c", "sleep infinity"]