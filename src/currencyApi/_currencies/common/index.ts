/*
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

	/** Indica se o módulo externo está online ou não */
	protected isOnline: boolean = false

	/**
	 * Handler da conexão com o módulo externo
	 */
	protected connection = methods.connection

	/**
	 * Limpa os itens com todos os comandos completos da checklist
	 */
	protected garbage_collector: (command: string) => Promise<void>

	/**
	 * Wrapper de comunicação com o socket do módulo externo
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected module(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			this._events.emit('module', event, ...args, ((error, response) => {
				if (error)
					reject(error)
				else
					resolve(response)
			}))
		})
	}

	/**
	 * EventEmmiter para eventos públicos
	 */
	events = new Events()

	/**
	 * Varre a checklist e executa as ordens de create_accounts agendadas
	 */
	create_account: () => Promise<void>

	/**
	 * Varre a checklist e executa as ordens de withdraw agendadas
	 */
	withdraw: () => Promise<void>

	constructor() {
		this.create_account = methods.create_account.bind(this)()
		this.garbage_collector = methods.garbage_collector.bind(this)()
		this.withdraw = methods.withdraw.bind(this)()
	}
}
