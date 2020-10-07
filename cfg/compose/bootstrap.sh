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
while [ $configLoop -eq 1 ]; do
	sleep 5
	for host in ${hostnames[@]}; do
		configLoop=0
		echo -n "connecting to config server ${host}... "
		/usr/bin/mongo $host --eval '{ ping: 1 }' > /dev/null
		if [ $? -eq 1 ]; then
			echo "Fail"
			configLoop=1
		else
			echo "Success"
		fi
	done
done

/usr/bin/mongo ${hostnames[0]} --eval 'rs.initiate({ "_id":"repset", "members":[ {"_id":0,"host":"config-01:27019"}, {"_id":1,"host":"config-02:27019"}, {"_id":2,"host":"config-03:27019"} ]})'

shardLoop=1
while [ $shardLoop -eq 1 ]; do
	sleep 5
	for shard in ${shardnames[@]}; do
		shardLoop=0
		echo -n "connecting to shard server ${shard}... "
		/usr/bin/mongo $shard --eval '{ ping: 1 }' > /dev/null
		if [ $? -eq 1 ]; then
			echo "Fail"
			shardLoop=1
		else
			echo "Success"
		fi
	done
done

/usr/bin/mongo $shardnames --eval 'rs.initiate({ "_id":"shard01", "members":[ {"_id":0,"host":"shard1a:27018"}, {"_id":1,"host":"shard1b:27018"}]})'

for shard in ${shardnames[@]}; do
	/usr/bin/mongo $router --eval \'"sh.addShard(shard01/$shard)"\' > /dev/null
done

echo "done"
