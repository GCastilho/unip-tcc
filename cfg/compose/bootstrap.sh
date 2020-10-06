hostnames=(
	"config-01:27017"
	"config-02:27017"
	"config-03:27017"
)

for host of ${hostnames[@]}; do
	/usr/bin/mongo $host --eval '{ ping: 1 }'
done

/usr/bin/mongo "config-02:27017" --eval 'rs.initiate({ "_id":"repset", "members":[ {"_id":0,"host":"config-01:27017"}, {"_id":1,"host":"config-02:27017"}, {"_id":2,"host":"config-03:27017"} ]})'

echo $?

/usr/bin/mongo "replica-02:27027" --eval '{ ping: 1 }'
