import socketIOClient from 'socket.io-client'

const socket = socketIOClient({
	autoConnect: false
})

socket.on('connect', () => {
	console.log('Connected to the socket')
})

socket.on('disconnect', reason => {
	console.log('Disconnected from the socket:', reason)
})

/** Abre a conexão com o socket */
export function connect() {
	socket.open()
}

/** Fecha a conexão com o socket */
export function disconnect() {
	socket.close()
}

/**
 * Checa a conexão; A promessa retornada por essa função só será resolvida caso
 * o socket esteja conectado ou uma vez que ele se conectar
 */
function checkConnection() {
	return new Promise(resolve => {
		if (socket.connected) return resolve()
		socket.once('connect', resolve)
	})
}

/**
 * Emite um evento ao socket, com o último argumento sendo uma função callback.
 * O retorno dessa função callback é retornado na forma de uma promessa,
 * rejeitada ou resolvida de acordo com a chamada desse callback
 *
 * @param event O evento que será enviado ao socket
 * @param args Os argumentos desse evento
 */
export function emit(event: string, ...args: any[]) {
	return new Promise((resolve, reject) => {
		checkConnection().then(() => {
			socket.emit(event, ...args, ((error, response) => {
				if (error) reject(error)
				else resolve(response)
			}))
		})
	})
}

/**
 * Autentica uma conexão com o websocket
 *
 * Se um token for informado, tenta se autenticar usando ele e salva-o
 * no localStorage
 *
 * Se nenhum token for informado tenta pegar o salvo no localStorage e
 * se autenticar usando ele
 *
 * @param token O token de autenticação com o websocket
 */
export async function authenticate(token?: string) {
	if (!token) token = localStorage.getItem('token')

	// Nenhum token informado e localStorage está vazio
	if (!token) return

	/**
	 * @todo Tentar pegar um novo token da API antes de presumir
	 * que não está autenticado
	 */
	try {
		await emit('authenticate', token)
		localStorage.setItem('token', token)
		console.log('Socket authentication successful')
	} catch (err) {
		console.error('Authentication error', err)
		if (err.name == 'AuthenticationError') localStorage.removeItem('token')
		throw err
	}
}

/**
 * Remove um token do localStorage e emite um evento de desautenticação com o
 * websocket
 */
export async function deauthenticate() {
	localStorage.removeItem('token')
	try {
		await emit('deauthenticate')
		console.log('Socket deauthentication successful')
	} catch (err) {
		console.error('Deauthentication error:', err)
		throw err
	}
}

/**
 * Remove uma função específica do array de listeners de um evento
 * @param event O nome do evento que estava sendo ouvido
 * @param fn A função que deverá ser removida do listener
 */
export function removeSocketListner(event: string, fn: (...args: any[]) => any) {
	socket.removeListener(event, fn)
}

/**
 * Adiciona um event listener no socket para um evento específico
 * @param event O nome do evento que será ouvido
 * @param fn A função que deverá ser chamada quando o evento ocorrer
 */
export function addSocketListener(event: string, fn: (...args: any[]) => any) {
	socket.on(event, fn)
	return () => removeSocketListner(event, fn)
}

// Tenta se autenticar com o socket assim que conectado
addSocketListener('connect', async () => {
	await authenticate().catch(() => null)
})
