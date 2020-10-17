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

echo -n "Waiting for config servers to accept connections... "
configServersOnline=0
# Se configServersOnline é igual ao length do array de hostnames
until [ $configServersOnline -eq ${#hostnames[@]} ]; do
	sleep 1
	configServersOnline=0
	for host in ${hostnames[@]}; do
		/usr/bin/mongo $host --eval '{ ping: 1 }' > /dev/null
		if [ $? -eq 0 ]; then
			configServersOnline=$((configServersOnline+1))
		fi
	done
done
echo "Done"

# Inicializa o replicaSet dos config servers
echo "Initializing config server's replicaSet"
/usr/bin/mongo ${hostnames[0]} --eval 'rs.initiate({ "_id":"repset", "configsvr": true, "version": 1, "members":[ {"_id":0,"host":"config-01:27019"}, {"_id":1,"host":"config-02:27019"}, {"_id":2,"host":"config-03:27019"} ]})' > /dev/null

echo -n "Waiting for shard servers to accept connections... "
shardServersOnline=0
# Se shardServersOnline é igual ao length do array de shardnames
until [ $shardServersOnline -eq ${#shardnames[@]} ]; do
	sleep 1
	shardServersOnline=0
	for shard in ${shardnames[@]}; do
		/usr/bin/mongo $shard --eval '{ ping: 1 }' > /dev/null
		if [ $? -eq 0 ]; then
			shardServersOnline=$((shardServersOnline+1))
		fi
	done
done
echo "Done"

# Inicializa o replicaSet dos shards
echo "Initializing shards's replicaSet..."
/usr/bin/mongo shard1a:27018 --eval 'rs.initiate({ _id: "shard01", "version": 1,"members":[ {"_id":0,"host":"shard1a:27018"}, {"_id":1,"host":"shard1b:27018"}]})' > /dev/null

until (/usr/bin/mongo $router --eval '{ ping: 1 }' >/dev/null 2>&1); do
	sleep 1
done

for shard in ${shardnames[@]}; do
	echo "Adding shard $shard to router"
	/usr/bin/mongo $router --eval "sh.addShard(\"shard01/$shard\")" > /dev/null
done

echo "done"
