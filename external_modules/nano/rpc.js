const rpc = require('node-json-rpc')
const wallet = '8125B334D967C6505D81DB5B1DDBB39833C94543B61A71D89BD2CFF672822DAE'
const stdAccount = 'nano_3xme79mg1r8ycr5fp5uhsfzi9x1wadtatci9k35gshoa9yixjap7xyi5aq41'


const options = {
	port: 55000,
	host: '::1',
	// string with default path, default '/'
	path: '/',
	// boolean false to turn rpc checks off, default true
	strict: false
}

const client = new rpc.Client(options)

function createAccount() {
	return new Promise((resolve, reject) => {
		client.call( {
			'action': 'account_create',
			'wallet': wallet
		},function (err,res) {
				
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}

function blockInfo(block) {
	return new Promise((resolve, reject) => {
		client.call({
			'action': 'block_info',
			'json_block': 'true',
			'hash': block
		}, (err, res) => {
			if (!err && !res.error) {
				resolve(res)
			} else {
				reject(err)
			}
		})
	})
}
function accountInfo(account) {
	return new Promise((resolve, reject) => {
		client.call({
			'action': 'account_info',
			'account': account
		}, (err, res) => {
			if (!err && !res.error) {
				resolve(res)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}


function send(destination,rawAmount) {
	return new Promise((resolve, reject) => {
		client.call({
			'action': 'send',
			'wallet': wallet,
			'source': stdAccount,
			'destination': destination,
			'amount': rawAmount
		}, (err, res) => {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}
function command(command) {
	return new Promise((resolve, reject) => {
		client.call(command, (err, res) => {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}
module.exports = {
	createAccount,
	blockInfo,
	accountInfo,
	send,
	command
}
