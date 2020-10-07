FROM mongo

COPY ./bootstrap.sh /

RUN chmod +x /bootstrap.sh

CMD ["/bootstrap.sh"]
