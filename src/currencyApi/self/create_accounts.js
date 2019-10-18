const Checklist = require('../../db/models/checklist')

module.exports = function create_accounts(userId, accounts) {
	return new Promise((resolve, reject) => {
		if (!userId) throw new TypeError('userId needs to be informed')
	
		// Significa que é para criar de todas as accounts
		if (!accounts) {
			new Checklist({
				userId,
	
				create_accounts: {
					bitcoin: 'requested',
					nano: 'requested'
				}
			}).save()
			.then(person => {
				console.log('salvo na checklist', person)
				resolve(person)
			}).catch(err => {
				console.log('erro ao salvar', err)
				reject(err)
			})
		}
	})
}
