const Checklist = require('../../db/models/checklist')
const allCurrencies = Object.keys(require('../currencies'))

/**
 * Cria as accounts (requisitadas) para o usuário com o userId informado. Essa
 * função salva quais accounts devem ser criadas em uma checklist e chama as
 * create_account de cada currency que foi requisitado uma nova account
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
	const create_accounts = {}
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

	/**
	 * Chama create_account de cada currency que precisa ser criada uma account
	 */
	currencies.forEach(currency => this.currencies[currency].create_account())
	
	return person //remove
}
