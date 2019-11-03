const processTransaction = require('./processTransaction')

module.exports = function eventHandler(events) {
	events.on('transaction', (body) => {
		processTransaction(body)
	})

	events.on('new_account',(res) => {
		rpc.createAccount().then(account => {
			res.send(account)
		}).catch(err => {
			res.status(500).send(err)
		})
	})
	
	events.on('send',(body, response) => {
		rpc.send(body.addres, body.amount).then(() => {
			response.send('sucess')
		}).catch(err => {
			response.status(500).send(err)
		})
	})
}
