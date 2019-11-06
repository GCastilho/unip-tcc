global.main_server_ip = process.env.MAIN_SERVER_IP || 'localhost'
global.main_server_port = process.env.MAIN_SERVER_PORT || '8085'
const port = process.env.PORT || 8090

const server = require('../common/server')
const eventHandler = require('./eventHandler')

/** Inicia o WebSocket */
require('./nanoWebSocket')

server.listen('nano', port)
	.then(EventEmitter =>
		eventHandler(EventEmitter)
	).catch((err)=> {
		console.error('error', err)
	})
