/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */

import * as methods from './methods'
import { EventEmitter } from 'events'
import socketIO = require('socket.io')

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	abstract name: string
	abstract code: string

	/**
	 * Handler da conexão com o módulo externo
	 */
	protected connection: (socket: socketIO.Socket) => void

	/**
	 * EventEmmiter para eventos internos
	 */
	protected _events = new Events()

	/**
	 * EventEmmiter para eventos públicos
	 */
	events = new Events()

	constructor() {
		this.connection = methods.connection
	}
}
