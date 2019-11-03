const rpc = require('node-json-rpc')
const wallet = '1396F74639C8912595BDE10C766461EBBEF1EE696794DA4807B197AB140C1949'
const stdAccount = 'nano_1cm99iqoqh53c464jz98u1qdzi37z5934rcz6byfdhkyhsq5aqqcqtt9dioi'


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
	'action': 'account_create',
	'wallet': wallet
}

function createAccount() {
	return new Promise((resolve, reject) => {
		client.call(account_create,function (err, res) {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
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
				resolve(res.account)
			} else {
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
				reject(err)
			}
		})
	})
}
module.exports = {
	createAccount,
	blockInfo,
	send,
	command
}
