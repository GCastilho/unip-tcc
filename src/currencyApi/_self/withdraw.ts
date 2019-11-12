import Checklist = require('../../db/models/checklist')
import Person = require('../../db/models/person')
import { CurrencyApi } from '../index'

/**
 * Adiciona o request de withdraw na checklist e chama o withdraw loop
 * 
 * @param email O email do usuário que a currency será retirada
 * @param currency A currency que será retirada
 * @param address O address de destino do saque
 * @param amount A quantidade que será sacada
 */
export async function withdraw(this: CurrencyApi,
		email: string,
		currency: string,
		address: string,
		amount: number
	) {

	/** Pega o userId, pois a checklist é identificada pelo userId do usuário */
	const { _id } = await Person.findOne({
		email
	}, {
		_id: 1
	})

	/**
	 * Adiciona o comando de withdraw na checklist
	 * 
	 * @todo Múltiplos requests de withdraw (atualmente só suporta 1)
	 */
	await Checklist.findOneAndUpdate({
		userId: _id
	}, {
		$set: {
			[`commands.withdraw.${currency}.status`]: 'requested',
			[`commands.withdraw.${currency}.address`]: address,
			[`commands.withdraw.${currency}.amount`]: amount
		}
	}, {
		upsert: true
	})

	/** Chama o método da currency para executar o withdraw */
	this._currencies[currency].withdraw()
}
