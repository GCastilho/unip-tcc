/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */

import * as methods from './methods'
import { EventEmitter } from 'events'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	abstract name: string
	abstract code: string

	/**
	 * EventEmmiter para eventos internos
	 */
	protected _events = new Events()

	/**
	 * EventEmmiter para eventos públicos
	 */
	events = new Events()

	/** Indica se o módulo externo está online ou não */
	protected isOnline: boolean = false

	/**
	 * Handler da conexão com o módulo externo
	 */
	protected connection = methods.connection

	/**
	 * Wrapper de comunicação com o socket do módulo externo
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected module(event: string, ...args: any) {
		this._events.emit('module', event, ...args)
	}

	constructor() {}
}
