import Checklist = require('../../db/models/checklist')
import { CurrencyApi } from '../index'
import { Schema } from 'mongoose'

/**
 * Cria as accounts (requisitadas) para o usuário com o userId informado. Essa
 * função salva quais accounts devem ser criadas em uma checklist e chama as
 * create_account de cada currency que foi requisitado uma nova account
 * 
 * @param userId O ObjectId do usuário
 * @param currencies As currencies que devem ser criadas accounts
 */
export async function create_accounts(this: CurrencyApi,
		userId: Schema.Types.ObjectId,
		currencies?: string[]
	) {
	if (!currencies) currencies = this.currencies

	/**
	 * O objeto 'create_accounts' que será salvo na checklist do database
	 */
	const create_accounts = {}
	for (let currency of currencies) {
		create_accounts[currency] = {}
		create_accounts[currency].status = 'requested'
	}

	/**
	 * @todo se uma pessoa com esse userId exitir, atualizar
	 */
	await new Checklist({
		userId,
		commands: { create_accounts }
	}).save()

	/**
	 * Chama create_account de cada currency que precisa ser criada uma account
	 */
	currencies.forEach(currency => this._currencies[currency].create_account())
}
