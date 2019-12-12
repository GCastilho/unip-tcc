import Checklist from '../../db/models/checklist'
import { CurrencyApi } from '../currencyApi'
import { Person } from '../../db/models/person/interface'

/**
 * Cria as accounts (requisitadas) para o usuário com o userId informado. Essa
 * função salva quais accounts devem ser criadas em uma checklist e chama as
 * create_account de cada currency que foi requisitado uma nova account
 * 
 * @param userId O ObjectId do usuário
 * @param currencies As currencies que devem ser criadas accounts
 */
export async function create_accounts(this: CurrencyApi,
		userId: Person['_id'],
		currencies: string[] = this.currencies
	) {

	/**
	 * O objeto 'create_accounts' que será salvo na checklist do database
	 */
	const create_accounts = {}
	for (let currency of currencies) {
		create_accounts[currency] = {}
		create_accounts[currency].status = 'requested'
	}

	await Checklist.findOneAndUpdate({
		userId
	}, {
		commands: { create_accounts }
	}, {
		upsert: true
	})

	/**
	 * Chama create_account de cada currency que precisa ser criada uma account
	 */
	currencies.forEach(currency => this._currencies[currency].create_account())
}
