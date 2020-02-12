import socketIOClient from 'socket.io-client'

export const socket = socketIOClient()

socket.on('connect', () => {
	console.log('Connected to the socket')
})

socket.on('disconnect', reason => {
	console.log('Disconnected from the socket:', reason)
})

/**
 * Re-roteia o websocket para um novo path
 * @param {string} path O novo path do websocket
 */
export function route(path = '/') {
	socket.emit('_path', path)
}

/**
 * Emite um evento ao socket, com o último argumento sendo uma função callback.
 * O retorno dessa função callback é retornado na forma de uma promessa,
 * rejeitada ou resolvida de acordo com a chamada desse callback
 * 
 * @param {stirng} event O evento que será enviado ao socket
 * @param  {...any} args Os argumentos desse evento
 */
export function emit(event, ...args) {
	return new Promise((resolve, reject) => {
		if (socket.disconnected) return reject('SocketDisconnected')
		socket.emit(event, ...args, ((error, response) => {
			if (error)
				reject(error)
			else
				resolve(response)
		}))
	})
}

/**
 * Adiciona um event listener no socket para um evento específico
 * @param {string} event O nome do evento que será ouvido
 * @param {function} fn A função que deverá ser chamada quando o evento ocorrer
 */
export function addSocketListener(event, fn) {
	socket.on(event, fn)
}

/**
 * Remove uma função específica do array de listeners de um evento
 * @param {*} event O nome do evento que estava sendo ouvido
 * @param {*} fn A função que deverá ser removida do listener
 */
export function removeSocketListner(event, fn) {
	socket.removeListener(event, fn)
}
