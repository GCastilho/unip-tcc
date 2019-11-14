import Checklist = require('../../../../db/models/checklist')
import Person = require('../../../../db/models/person')
import Common from '../index'

/**
 * Retorna uma função que varre a collection da checklist procurando por
 * comandos de withdraw que foram requisitados
 * 
 * Essa função tem um garbage collector em seu closure para limpar o command
 * 'withdraw'
 * 
 * Essa função também garante que haverá uma única instância varrendo a
 * collection (por instância da classe) para evitar problemas de race condition
 */
export function withdraw(this: Common) {
	/**
	 * Controla as instâncias do withdraw_loop
	 */
	let looping: boolean = false

	this._events.on('connected', () => {
		_withdraw()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

	/**
	 * Limpa da checklist.withdraw os requests de currencies com state 'completed'
	 */
	const garbage_collector = async () => {
		/**
		 * Se um item foi ou não deletado
		 */
		let deleted = false

		const checklist = await Checklist.find().cursor()
		let item: any = undefined
		while ( item = await checklist.next() ) {
			if (item.commands.withdraw[this.name].status === 'completed') {
				item.commands.withdraw[this.name] = undefined
				await item.save()
				deleted = true
			}
		}
		if (deleted)
			await this.garbage_collector('withdraw')
	}

	/**
	 * @todo Reprojetar o journaling
	 * @todo Handler do journaling
	 * @todo Checar por possível race condition (especialmente no amount)
	 */
	const withdraw_loop = async () => {
		const checklist = Checklist.find().cursor()
		let todo_item: any
		while ( todo_item = await checklist.next() ) {
			const { userId, commands: { withdraw } } = todo_item

			if (withdraw[this.name].status === 'requested') {
				const person = await Person.findById(userId)
				
				const balance = person.currencies[this.name].balance
				const amount = withdraw[this.name].amount
				if (balance - amount < 0) {
					withdraw[this.name].status = 'completed'
					await todo_item.save()
					continue
				}

				// Journaling
				withdraw[this.name].status = 'processing'
				withdraw[this.name].balance_before = balance
				await todo_item.save()

				withdraw[this.name].status = 'order dispatched'
				/**@todo transaction ser uma interface transaction */
				const [transaction] = await Promise.all([
					this.module('withdraw',
						withdraw[this.name].address,
						amount
					),
					await todo_item.save()
				])

				withdraw[this.name].status = 'order executed'
				await todo_item.save()

				person.currencies[this.name].balance -= amount
				person.currencies[this.name].sended.push(transaction)
				person.save()

				withdraw[this.name].status = 'completed'
				await todo_item.save()
			}
			if (!looping) break
		}
	}

	const _withdraw = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await withdraw_loop()
			await garbage_collector()
		} catch(err) {
			console.error(err)
		}
		looping = false
	}

	return _withdraw
}
