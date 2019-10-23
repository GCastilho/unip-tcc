const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

function constructor() {
	/**
	 * Controla as instâncias do create_account_loop
	 */
	let looping = false

	this._events.on('connected', () => {
		create_account()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

	const create_account_loop = async (checklist) => {
		while (todo_item = await checklist.next()) {
			const { userId, create_accounts } = todo_item

			if (create_accounts[this.name].status === 'requested') {
				const person = await Person.findById(userId)

				// Journaling
				const accounts_before = person.currencies[this.name].length
				todo_item.create_accounts[this.name].status = 'processing'
				todo_item.create_accounts[this.name].accounts_before = accounts_before
				await todo_item.save()

				const account = await this._module.get('new_account')

				person.currencies[this.name].push(account)
				await person.save()

				todo_item.create_accounts[this.name].status = 'completed'
				await todo_item.save()
			} else if (create_accounts[this.name].status === 'processing') {
				/*
				 * Caso o processo tenha sido interrompido, usa o journaling
				 * pra saber o que já foi feito e o que ainda não foi
				 */
				const person = await Person.findById(userId)
				const accounts_now = person.currencies[this.name].length
				const { accounts_before } = create_accounts[this.name]

				if (accounts_now === accounts_before) {
					/**
					 * Quer dizer que nada foi feito, nesse caso voltar para
					 * 'requested' irá fazer esse item ser executado normalmente
					 * pela parte do if que processa o 'requested'
					 */
					todo_item.create_accounts[this.name].status = 'requested'
					await todo_item.save()
				} else if (accounts_now > accounts_before) {
					/**
					 * Significa que a account já foi adicionada mas por algum
					 * motivo a checklist não foi atualizada
					 */
					todo_item.create_accounts[this.name].status = 'completed'
					await todo_item.save()
				} else {
					console.error(`Ao encontrar o status do usuário '${person.email}' como 'processing', o create_account detectou um número de accounts INFERIOR ao estado salvo na checklist, ESTE É UM ERRO GRAVE.`)
					todo_item.create_accounts[this.name].status = 'ERROR'
					todo_item.create_accounts[this.name].accounts_after = accounts_now
					await todo_item.save()
				}
			}
			if (!looping) break
		}
		looping = false
	}

	return create_account = async () => {
		if (!looping && this.isOnline) {
			looping = true
			try {
				const checklist = await Checklist.find().cursor()
				create_account_loop(checklist)
			} catch(err) {
				looping = false
				console.error(err)
			}
		}
	}
}

module.exports = constructor
