module.exports = function ping() {
	return axios.get(`http://${this.ip}:${this.port}/ping`)
	.then(({ data }) => {
		if (data != 'pong') {
			this.isOnline = false
			throw new TypeError(`Unrecognized response: ${data}`)
		}
		this.isOnline = true
	}).catch(err => {
		this.isOnline = false
		throw new Error(`${this.name} server is offline`)
	})
}

isOnline = false
