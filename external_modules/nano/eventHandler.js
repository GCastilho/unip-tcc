const processTransaction = require('./processTransaction')
const rpc = require('./rpc')

module.exports = function eventHandler(events) {
	events.on('transaction', (body) => {
		processTransaction(body)
	})

	events.on('new_account',(res) => {
		rpc.createAccount().then(account => {
			res.send(account)
		}).catch(err => {
			console.error(err)
			res.status(500).send(err)
		})
	})
	
	events.on('send',(body, response) => {
		rpc.send(body.address,body.amount).then((res) => {
			response.send({
				txid: res.block,
				timestamp: Date.now(),
				account: body.address,
				amount: body.amount
			})
		}).catch(err => {
			response.status(500).send(err)
		})
	})
}
