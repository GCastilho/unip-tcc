const _events = require('../self/_events')
const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

module.exports = function init() {
	/**
	 * Controla as instâncias do create_account_loop
	 */
	let looping = false

	_events.on('createAccount', (currencies) => {
		if (currencies.includes(this.name)) {
			create_account_loop()
			
			console.log('evento create-account da', this.name)
		}
	})

	_events.on('connected', (currency) => {
		if (this.name === currency) {
			create_account_loop()
		}
	})

	_events.on('disconnected', (currency) => {
		if (this.name === currency) {
			looping = false
		}
	})

	const create_account_loop = async () => {
		if (!looping && this.isOnline) {
			looping = true
			let checklist
			try {
				checklist = await Checklist.find().cursor();
			} catch(err) {
				looping = false
				console.error(err)
			}
			(async function loop() {
				try {
					while (todo_item = await checklist.next()) {
						const { userId, create_accounts } = todo_item
						if (create_accounts[this.name] === 'requested') {
							const account = await this._module.get('new_account')
	
							const person = await Person.findById(userId)
							person.currencies[this.name].push(account)
							await person.save()
	
							todo_item.create_accounts[this.name] = 'completed'
							await todo_item.save()
						}
					}
					looping = false
					// Emitir um evento que terminou (currency, command)
					// Executar função que verifica se pode limpar o db
				} catch(err) {
					looping = false
					console.error(err)
				}
			}).bind(this)()
		}
	}
}
