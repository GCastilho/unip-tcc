const rpc = require('node-json-rpc')
const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT

if (!wallet) throw 'WALLET needs to be informed as environment variable'
if (!stdAccount) throw 'SEND_ACCOUNT needs to be informed as environment variable'

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
		client.call({
			'action': 'account_create',
			'wallet': wallet
		}, function (err, res) {
			if (!err && !res.error) {
				new Account({
					account: res.account,
					isUpdated: true
				}).save().then(() => {
					resolve(res.account)
				}).catch(err => {
					reject(err)
				})
			} else {
				reject(err, res.error)
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


function send(destination, rawAmount) {
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
