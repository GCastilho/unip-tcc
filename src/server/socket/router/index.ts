import routes from 'routes'
import balances from './balances'

export class GlobalListeners {
	/**
	 * Um array de touples [ eventName, eventHandler ] de todos os eventos
	 * globais
	 */
	private static listeners: [string, (...args: any[]) => void][] = []

	/**
	 * Adiciona um evento global estático, que são eventos que nunca serão
	 * removidos ou modificados
	 * @param event O nome do evento
	 * @param fn A função callback desse evento
	 */
	static add(event: string, fn: (...args: any[]) => void): void {
		if (typeof event !== 'string' || typeof fn !== 'function')
			throw new Error('IllegalInput')
		this.listeners.push([event, fn])
	}

	/** Retorna uma touple [ eventName, EventHandler ] de cada evento global */
	static getListeners() {
		return this.listeners
	}

	/** Retorna os nomes de todos os eventos globais */
	static getListenersNames() {
		return this.listeners.map(([eventName]) => eventName)
	}
}

const router = routes()
router.addRoute('/balances', balances)

function route(socket: SocketIO.Socket, path = '/') {
	/** Remove todos os eventos não globais */
	GlobalListeners.getListenersNames()
		.filter(i => !socket.eventNames().includes(i))
		.forEach(event => socket.removeAllListeners(event))

	/**
	 * Checa se existe match para o path dado e em caso afirmativo chama o
	 * handler para ele
	 */
	const match = router.match(path)
	if (typeof match?.fn === 'function')
		match.fn(socket, ...match.splats)
}

export function use(socket: SocketIO.Socket) {
	/** Adiciona os listeners globais */
	GlobalListeners.getListeners().forEach(([event, fn]) => socket.on(event, fn))

	route(socket)
}

/** Handler de re-routeamento */
GlobalListeners.add('_path', function(this: SocketIO.Socket, newPath?: string) {
	route(this, newPath)
})
