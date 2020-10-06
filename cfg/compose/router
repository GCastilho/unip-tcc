FROM mongo

RUN mongos --port 27018 --configdb configserver/replica-01:27017,replica-02:27017,replica-03:27017 --bind_ip_all

RUN mongo --port 27018

RUN sh.addShard("shard01/mongo-shard1a:27019")

RUN sh.addShard("shard01/mongo-shard1a:27019")
