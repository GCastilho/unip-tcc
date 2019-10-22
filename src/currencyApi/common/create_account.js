const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

function constructor() {
	/**
	 * Controla as instâncias do create_account_loop
	 */
	let looping = false

	this._events.on('connected', () => {
		create_account_loop()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

	return create_account_loop = async () => {
		if (!looping && this.isOnline) {
			looping = true
			let checklist
			try {
				checklist = await Checklist.find().cursor();
			} catch(err) {
				looping = false
				console.error(err)
				return
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
						if (!looping) break
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

module.exports = constructor
