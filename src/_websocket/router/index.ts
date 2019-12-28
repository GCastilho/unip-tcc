import routes from 'routes'
import balances from './balances'

const router = routes()

router.addRoute('/balances', balances)

export function use(path: string, socket: SocketIO.Socket) {
	/** Remove os listeners do path antigo */
	socket.removeAllListeners()

	/** Re-executa essa função no evento '_path' */
	socket.on('_path', (newPath) => {
		socket.handshake.headers.path = newPath || '/'
		use(socket.handshake.headers.path, socket)
	})

	const match = router.match(path)
	if (typeof match?.fn === 'function')
		match.fn(socket, ...match.splats)
}
