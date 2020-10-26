import express from 'express'
import socket from 'socket.io'
import { Server } from 'http'
import api from './api'
import socketHandler from './socket'

const app = express()
app.use(api)

/** HTTP server */
const server = new Server(app)

// Bind websocket to http server
socketHandler(socket(server))

/** Porta que o servidor HTTP irá ouvir por conexões */
const port = +(process.env.PORT || 3001)

server.listen(port, () => {
	console.info('Server is up on port', port)
})
