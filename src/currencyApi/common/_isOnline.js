module.exports = function isOnline() {
	this._connection.on('error', function disconnectedParser(currency) {
		if (this.name === currency) {
			isOnline = false
			/** @todo Checar pela conexão, emitir disconnected se falhar */
		}
		console.log(currency, 'disconnected')
	})

	this._connection.on('connected', function connectedParser(currency) {
		if (this.name === currency) {
			isOnline = true
		}
	})
}
