/*
 * src/currencyApi/common/create_account.js
 * 
 * Esse módulo exporta um controller que mantém uma única instância de um loop
 * (create_account_loop), que varre a checklist procurando por accounts de
 * usuários que ele deve criar
 * 
 * Após terminar de varrer o banco de dados, ele chama o garbage collector, que
 * limpa o objeto create_accounts da collection da checklist e em seguida chama
 * o this._garbage_collector
 */

/* eslint-disable require-atomic-updates */
const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

module.exports = function constructor() {
	/**
	 * Controla as instâncias do create_account_loop
	 */
	let looping = false

	/**
	 * Constrola as instâncias do garbage collector
	 */
	let collecting = false

	this._events.on('connected', () => {
		this.create_account()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

	/**
	 * Limpa da checklist.create_accounts as currencies com state 'completed'
	 */
	const garbage_collector = async () => {
		/**
		 * Se um item foi ou não deletado
		 */
		let deleted = false

		const checklist = await Checklist.find().cursor()
		while (( item = await checklist.next() )) {
			if (item.commands.create_accounts[this.name].status === 'completed') {
				item.commands.create_accounts[this.name] = undefined
				await item.save()
				deleted = true
			}
		}
		if (deleted)
			await this._garbage_collector('create_accounts')
	}

	const create_account_loop = async () => {
		const checklist = await Checklist.find().cursor()
		while (( todo_item = await checklist.next() )) {
			const { userId, commands: { create_accounts } } = todo_item
			/**
			 * Workaround do while não estar esperando o await do person
			 */
			const item = todo_item

			if (create_accounts[this.name].status === 'requested') {
				const person = await Person.findById(userId)

				// Journaling
				const accounts_before = person.currencies[this.name].accounts.length
				item.commands.create_accounts[this.name].status = 'processing'
				item.commands.create_accounts[this.name].accounts_before = accounts_before
				await item.save()

				const account = await this._module.get('new_account')

				person.currencies[this.name].accounts.push(account)
				await person.save()

				item.commands.create_accounts[this.name].status = 'completed'
				await item.save()
			} else if (create_accounts[this.name].status === 'processing') {
				/*
				 * Caso o processo tenha sido interrompido, usa o journaling
				 * pra saber o que já foi feito e o que ainda não foi
				 */
				const person = await Person.findById(userId)
				const accounts_now = person.currencies[this.name].accounts.length
				const { accounts_before } = create_accounts[this.name]

				if (accounts_now === accounts_before) {
					/**
					 * Quer dizer que nada foi feito, nesse caso voltar para
					 * 'requested' irá fazer esse item ser executado normalmente
					 * pela parte do if que processa o 'requested'
					 */
					item.commands.create_accounts[this.name].status = 'requested'
					await item.save()
				} else if (accounts_now > accounts_before) {
					/**
					 * Significa que a account já foi adicionada mas por algum
					 * motivo a checklist não foi atualizada
					 */
					item.commands.create_accounts[this.name].status = 'completed'
					await item.save()
				} else {
					console.error(`Ao encontrar o status do usuário '${person.email}' como 'processing', o create_account detectou um número de accounts INFERIOR ao estado salvo na checklist, ESTE É UM ERRO GRAVE.`)
					item.commands.create_accounts[this.name].status = 'ERROR'
					item.commands.create_accounts[this.name].accounts_after = accounts_now
					await item.save()
				}
			}
			if (!looping) break
		}
		looping = false
	}

	return async function create_account() {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await create_account_loop()
			if (!collecting)
				await garbage_collector()
		} catch(err) {
			looping = false
			console.error(err)
		}
	}
}
