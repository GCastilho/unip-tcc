import rpc from 'node-json-rpc'
import Account from '../../_common/db/models/account'
import { Transaction } from '../../_common'

const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT

export function nanoRpc() {
	const client = new rpc.Client({
		port: 55000,
		host: '::1',
		path: '/',
		strict: false // turn rpc checks off, default true
	})
	
	const convertToNano = (amount: string) => {
		return new Promise((resolve,reject) => {
			client.call({
				'action': 'rai_from_raw',
				'amount': amount
			}, (err, res) => {
				if (!err && !res.error) {
					resolve(res.amount)
				} else {
					reject(err)
				}
			})
		})
	}
	
	const convertToRaw = (amount: string) => {
		return new Promise((resolve,reject) => {
			client.call({
				'action': 'rai_to_raw',
				'amount': amount
			}, (err, res) => {
				if (!err && !res.error) {
					resolve(res.amount)
				} else {
					reject(err)
				}
			})
		})
	}

	const createAccount = () => {
		return new Promise<string>((resolve, reject) => {
			client.call({
				'action': 'account_create',
				'wallet': wallet
			}, function (err, res) {
				if (!err && !res.error) {
					new Account({
						account: res.account
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
	
	const blockInfo = (block: string) => {
		return new Promise<any>((resolve, reject) => {
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

	const accountInfo = (account: string) => {
		return new Promise<any>((resolve, reject) => {
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

	function send(destination: string , nanoAmount: number) {
		return new Promise<Transaction>((resolve,reject) => {
			convertToRaw(nanoAmount.toString()).then((amount: string) => {
				client.call({
					'action': 'send',
					'wallet': wallet,
					'source': stdAccount,
					'destination': destination,
					'amount': amount
				},(err,res) => {
					if (!err && !res.error) {
						const block: Transaction = res.block
						resolve(block)
					} else {
						console.error(res)
						console.error(err)
						reject(err)
					}
				})
		
			})
		})
	}

	const command = (command: any) => {
		return new Promise((resolve, reject) => {
			client.call(JSON.stringify(command), (err, res) => {
				if (!err && !res.error) {
					resolve(res.account)
				} else {
					console.error(res)
					reject(err)
				}
			})
		})
	}

	return {
		convertToNano,
		convertToRaw,
		createAccount,
		blockInfo,
		accountInfo,
		send,
		command
	}
}

