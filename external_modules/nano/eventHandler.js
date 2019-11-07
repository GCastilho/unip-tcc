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
	
	events.on('send',(body,response) => {
		console.log(body)
		rpc.send(body.address,body.amount).then((res) => {
			console.log('rpc enviou'+ res.block +' - ' +res )
			response.send({
				txid: res,
				timestamp: Date.now(),
				account: body.address,
				amount: body.amount
			})
		}).catch(err => {
			console.log(err)
			response.status(500).send(err)
		})
	})
}
