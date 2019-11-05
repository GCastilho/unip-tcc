/*
 * src/currencyApi/currencyModule/withdraw.js
 * 
 * Esse módulo exporta um controller que mantém uma única instância de um loop
 * (withdraw_loop), que varre a checklist procurando por requests de withdraw
 * de usuários que ele deve executar
 * 
 * Após terminar de varrer o banco de dados, ele chama o garbage collector, que
 * limpa o objeto withdraw da collection da checklist e em seguida chama
 * o this._garbage_collector
 */

/* eslint-disable require-atomic-updates */
const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

module.exports = function constructor() {
	/**
	 * Controla as instâncias do withdraw_loop
	 */
	let looping = false

	/**
	 * Constrola as instâncias do garbage collector
	 */
	let collecting = false

	this._events.on('connected', () => {
		this.withdraw()
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
		while (( item = await checklist.next() )) {
			if (item.commands.withdraw[this.name].status === 'completed') {
				item.commands.withdraw[this.name] = undefined
				await item.save()
				deleted = true
			}
		}
		if (deleted)
			await this._garbage_collector('withdraw')
	}

	/**
	 * @todo Reprojetar o journaling
	 * @todo Handler do journaling
	 * @todo Checar por possível race condition (especialmente no ammount)
	 */
	const withdraw_loop = async () => {
		const checklist = await Checklist.find().cursor()
		while (( todo_item = await checklist.next() )) {
			const { userId, commands: { withdraw } } = todo_item
			/**
			 * Workaround do while não estar esperando o await do person
			 */
			const item = todo_item

			if (withdraw[this.name].status === 'requested') {
				const person = await Person.findById(userId)
				
				const balance = person.currencies[this.name].balance
				const ammount = withdraw[this.name].ammount
				if (balance - ammount < 0) {
					withdraw[this.name].status = 'completed'
					await item.save()
					continue
				}

				// Journaling
				withdraw[this.name].status = 'processing'
				withdraw[this.name].balance_before = balance
				await item.save()

				withdraw[this.name].status = 'order dispatched'
				const [transaction] = await Promise.all([
					this._module.post('send', {
						address: withdraw[this.name].address,
						ammount
					}),
					await item.save()
				])

				withdraw[this.name].status = 'order executed'
				await item.save()

				person.currencies[this.name].balance -= ammount
				person.currencies[this.name].sended.push(transaction)
				person.save()

				withdraw[this.name].status = 'completed'
				await item.save()
			}
			if (!looping) break
		}
		looping = false
	}

	return async function withdraw() {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await withdraw_loop()
			if (!collecting)
				await garbage_collector()
		} catch(err) {
			looping = false
			console.error(err)
		}
	}
}
