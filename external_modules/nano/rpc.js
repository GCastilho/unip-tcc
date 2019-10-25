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

const account_create = {
	"action": "account_create",
	"wallet":"CA765148AB7D6200DA9F51C4AA5B33BA8CC0C2749F6097A641EBD9B78456417A"
}

function createAccount() {
	return new Promise(function(resolve, reject) {
		client.call(account_create,function (err, res) {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				reject(err)
			}
		}
	)})
}
function blockInfo(block) {
	return new Promise(function (resolve, reject) {
		client.call({
			"action": "block_info",
			"json_block": "true",
			"hash": block
		}, function (err, res) {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				reject(err)
			}
		}
		)
	})
}

module.exports = {
	createAccount,
	blockInfo
}
