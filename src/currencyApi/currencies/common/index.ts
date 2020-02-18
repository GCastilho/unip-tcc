/*
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */

import Checklist from '../../../db/models/checklist'
import * as methods from './methods'
import { EventEmitter } from 'events'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	/** O nome da currency que esta classe se comunica */
	abstract name: 'bitcoin'|'nano'

	/** O código da currency */
	abstract code: string

	/** A quantidade de casas decimais que esta currency tem */
	public decimals: number = 8

	/** A quantidade de casas decimais desta currency que o sistema opera */
	public supportedDecimals: number = 8

	/** EventEmmiter para eventos internos */
	protected _events = new Events()

	/** Indica se o módulo externo está online ou não */
	protected isOnline: boolean = false

	/** Limpa da checklist itens com todos os comandos completos */
	protected checklistCleaner = async (command: string): Promise<void> => {
		/**
		 * Limpa os comandos que são objetos vazios da checklist
		 */
		const res = await Checklist.updateMany({
			[`commands.${command}`]: {}
		}, {
			$unset: {
				[`commands.${command}`]: true
			}
		})

		/**
		 * Limpa os itens da checklist em que a prop 'commands' está vazia
		 */
		if (res.deletedCount && res.deletedCount > 0)
			await Checklist.deleteMany({ 'commands': null })
	}

	/**
	 * Wrapper de comunicação com o socket do módulo externo
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 * 
	 * @throws SocketDisconnected if socket is disconnected
	 */
	protected module(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.isOnline) reject('Module is offline')
			this._events.emit('module', event, ...args, ((error, response) => {
				if (error)
					reject(error)
				else
					resolve(response)
			}))
		})
	}

	/** EventEmmiter para eventos públicos */
	public events = new Events()

	/** Handler da conexão com o módulo externo */
	public connection = methods.connection

	/** Varre a checklist e executa as ordens de create_accounts agendadas */
	public create_account: () => Promise<void>

	/** Varre a checklist e executa as ordens de withdraw agendadas */
	public withdraw: () => Promise<void>

	constructor() {
		this.create_account = methods.create_account.bind(this)()
		this.withdraw = methods.withdraw.bind(this)()
	}
}
