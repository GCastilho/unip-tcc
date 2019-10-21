const Checklist = require('../../db/models/checklist')
const allCurrencies = Object.keys(require('../currencies'))
const _events = require('./_events')

/**
 * Cria as accounts (requisitadas) para o usuário com o userId informado. Essa
 * função salva quais accounts devem ser criadas em uma checklist e emite um
 * evento para informar aos módulos individuais que as accounts devem
 * ser criadas
 * 
 * @param {ObjectId} userId Um ObjectId schema do mongodb
 * @param {String[]} [currencies=allCurrencies] As currencies que devem ser
 * criadas accounts
 * @throws Will throw if userId is falsy
 * @throws Will throw if mongoose fail to save on the checklist
 */
module.exports = async function create_accounts(userId, currencies) {
	if (!userId) throw new TypeError('userId needs to be informed')
	if (!currencies) currencies = allCurrencies

	/**
	 * O objeto 'create_accounts' que será salvo na checklist do database
	 */
	let create_accounts = {}
	for (let currency of currencies) {
		create_accounts[currency] = 'requested'
	}

	/**
	 * @todo se uma pessoa com esse userId exitir, atualizar
	 */
	const person = await new Checklist({
		userId,
		create_accounts
	}).save()
	console.log('salvo na checklist:', person) //remove

	/** Emite um evento informando que accounts devem ser criadas */
	_events.emit('createAccount', currencies)
	
	return person
}
