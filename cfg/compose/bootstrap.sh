hostnames=(
	"config-01:27019"
	"config-02:27019"
	"config-03:27019"
)

shardnames=(
	"shard1a:27018"
	"shard1b:27018"
)

router="mongo-router:27017"

configLoop=1
while [configLoop -eq 1]; do
	sleep 5
	for host of ${hostnames[@]}; do
		configLoop=0
		/usr/bin/mongo $host --eval '{ ping: 1 }'
		if [ $? -eq 1 ]; then
			configLoop=1
		fi
	done
done

/usr/bin/mongo hostnames[0] --eval 'rs.initiate({ "_id":"repset", "members":[ {"_id":0,"host":"config-01:27019"}, {"_id":1,"host":"config-02:27019"}, {"_id":2,"host":"config-03:27019"} ]})'

shardLoop=1
while [$shardLoop -eq 1]; do
	sleep 5
	for shard of ${shardnames[@]}; do
		configLoop=0
		/usr/bin/mongo $shard --eval '{ ping: 1 }'
		if [ $? -eq 1 ]; then
			configLoop=1
		fi
	done
done

/usr/bin/mongo shardnames[0] --eval 'rs.initiate({ "_id":"repset", "members":[ {"_id":0,"host":"shard1a:27018"}, {"_id":1,"host":"shard1b:27018"}]})'

for shard of ${shardnames[@]}; do
	/usr/bin/mongo router --eval `\'sh.addShard(shard01/${$shard})\'`
done

