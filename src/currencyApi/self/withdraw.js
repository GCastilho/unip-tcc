/*
 * src/currencyApi/self/withdraw.js
 * 
 * Adiciona o request de withdraw na checklist e chama o withdraw loop
 */

const Checklist = require('../../db/models/checklist')
const Person = require('../../db/models/person')

module.exports = async function withdraw(email, currency, address, ammount) {
	if (!email) throw new TypeError('\'email\' is required')
	if (!currency) throw new TypeError('\'currency\' is required')
	if (!address) throw new TypeError('\'address\' is required')
	if (!ammount) throw new TypeError('\'ammount\' is required')

	/** Pega o userId, pois a checklist é identificada pelo userId do usuário */
	const { _id } = await Person.findOne({
		email
	}, {
		_id: 1
	})

	/**
	 * Adiciona o comando de withdraw na checklist. Nada garante que esse
	 * withdraw será executado, pois os checks de salto e destino serão feitos
	 * pelo checklist_loop
	 * 
	 * @todo Múltiplos requests de withdraw (atualmente só suporta 1)
	 */
	await Checklist.findOneAndUpdate({
		userId: _id
	}, {
		$set: {
			[`commands.withdraw.${currency}.status`]: 'requested',
			[`commands.withdraw.${currency}.address`]: address,
			[`commands.withdraw.${currency}.ammount`]: ammount
		}
	}, {
		upsert: true
	})

	/** Chama a função que executa withdraw de fato */
	this.currencies[currency].withdraw()
}
