FROM mongo:4.4

COPY ./bootstrap.sh /

RUN chmod +x /bootstrap.sh

CMD ["/bootstrap.sh"]
