const processTransaction = require('./processTransaction')

module.exports = function eventHandler(events) {
	events.on('transaction', (body) => {
		processTransaction(body)
	})
}
