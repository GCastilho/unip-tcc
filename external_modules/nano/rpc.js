const rpc = require('node-json-rpc')
const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT
const Account = require('./db/models/account')

const options = {
	port: 55000,
	host: '::1',
	// string with default path, default '/'
	path: '/',
	// boolean false to turn rpc checks off, default true
	strict: false
}

const client = new rpc.Client(options)

function convertToNano(amount) {
	return new Promise((resolve,reject) => {
		client.call({
			'action': 'rai_from_raw',
			'amount': amount
		},(err,res) => {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}

function convertToRaw(amount) {
	return new Promise((resolve,reject) => {
		client.call({
			'action': 'rai_to_raw',
			'amount': amount
		},(err,res) => {
			if (!err && !res.error) {
				resolve(res.account)
			} else {
				console.log(res)
				reject(err)
			}
		})
	})
}



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
				const error = err ? err : res.error
				reject(error)
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

function send(destination,nanoAmount) {
	return new Promise((resolve,reject) => {
		convertToRaw(nanoAmount).then(amount => {
			client.call({
				'action': 'send',
				'wallet': wallet,
				'source': stdAccount,
				'destination': destination,
				'amount': amount
			},(err,res) => {
				if (!err && !res.error) {
					resolve(res.block)
				} else {
					console.log(res)
					console.log(err)
					reject(err)
				}
			})
	
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
	convertToNano,
	convertToRaw,
	createAccount,
	blockInfo,
	accountInfo,
	send,
	command
}
