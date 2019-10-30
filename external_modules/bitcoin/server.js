global.main_server_ip = process.env.MAIN_SERVER_IP || 'localhost:8085'
const port = process.env.PORT || 8091

const server = require('../common/server')
const eventHandler = require('./eventHandler')

server.listen('bitcoin', port)
	.then(EventEmitter =>
		eventHandler(EventEmitter)
	).catch((err)=> {
		console.error('error', err)
	})
