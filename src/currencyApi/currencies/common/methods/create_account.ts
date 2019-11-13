import Checklist = require('../../../../db/models/checklist')
import Person = require('../../../../db/models/person')
import Common from '../index'

/**
 * Retorna uma função que varre a collection checklist procurando por accounts
 * para criar
 * 
 * Essa função tem um garbage collector em seu closure, para limpar o comando
 * 'create_account' da checklist. Ao terminar ela chama o garbage_collector da
 * classe
 * 
 * Essa função também garante uma única instância por curency varrendo a
 * checklist para criar accounts para impedir problemas de race condition
 */
export function create_account(this: Common) {
	/**
	 * Controla as instâncias da create_account
	 */
	let looping: boolean = false

	this._events.on('connected', () => {
		_create_account()
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

		const checklist = Checklist.find().cursor()
		let item: any
		while (( item = await checklist.next() )) {
			if (item.commands.create_accounts[this.name].status === 'completed') {
				item.commands.create_accounts[this.name] = undefined
				await item.save()
				deleted = true
			}
		}
		if (deleted)
			await this.garbage_collector('create_accounts')
	}

	const create_account_loop = async () => {
		const checklist = Checklist.find().cursor()
		let todo_item: any
		while (( todo_item = await checklist.next() )) {
			const { userId, commands: { create_accounts } } = todo_item

			if (create_accounts[this.name].status === 'requested') {
				const person = await Person.findById(userId)

				// Journaling
				const accounts_before = person.currencies[this.name].accounts.length
				todo_item.commands.create_accounts[this.name].status = 'processing'
				todo_item.commands.create_accounts[this.name].accounts_before = accounts_before
				await todo_item.save()

				const account: string = await this.module('get_new_account')

				person.currencies[this.name].accounts.push(account)
				await person.save()

				todo_item.commands.create_accounts[this.name].status = 'completed'
				await todo_item.save()
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
					todo_item.commands.create_accounts[this.name].status = 'requested'
					await todo_item.save()
				} else if (accounts_now > accounts_before) {
					/**
					 * Significa que a account já foi adicionada mas por algum
					 * motivo a checklist não foi atualizada
					 */
					todo_item.commands.create_accounts[this.name].status = 'completed'
					await todo_item.save()
				} else {
					console.error(`Ao encontrar o status do usuário '${person.email}' como 'processing', o create_account detectou um número de accounts INFERIOR ao estado salvo na checklist, ESTE É UM ERRO GRAVE.`)
					todo_item.commands.create_accounts[this.name].status = 'ERROR'
					todo_item.commands.create_accounts[this.name].accounts_after = accounts_now
					await todo_item.save()
				}
			}
			if (!looping) break
		}
	}

	const _create_account = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await create_account_loop()
			await garbage_collector()
		} catch(err) {
			console.error(err)
		}
		looping = false
	}

	return _create_account
}
