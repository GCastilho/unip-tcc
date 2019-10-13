const rpc = require('node-json-rpc')

const options = {
	port: 55000,
	host: '::1',
	// string with default path, default '/'
	path: '/',
	// boolean false to turn rpc checks off, default true
	strict: false
}
const client = new rpc.Client(options)

createAccount = {
	"action": "account_create",
	"wallet":"F80357B81E856EF1BA68EE35974BAFEFDACEFB3DA4B5A06F904DE211C916D85E"
}

module.exports ={
	createAccount : function(){ 
		return new Promise(function(resolve, reject) {
		client.call(createAccount,function (err, res) {
			if(err) {
				reject(err)
			} else{
				resolve(res.account)
			}
		})
	})}
}
