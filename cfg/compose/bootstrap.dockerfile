FROM mongo

COPY ./bootstrap.sh /

RUN chmod +x /bootstrap.sh

ENTRYPOINT ["/bootstrap.sh"]
