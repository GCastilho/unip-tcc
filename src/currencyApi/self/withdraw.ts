import { ObjectId } from 'mongodb'
import Checklist from '../../db/models/checklist'
import Transaction from '../../db/models/transaction'
import User from '../../userApi/user'
import { CurrencyApi, SuportedCurrencies as SC } from '../currencyApi'

/**
 * Adiciona o request de withdraw na checklist, a operação na transaction,
 * bloqueia o saldo do usuário e chama o withdraw loop
 * 
 * @param user Instância da classe user do usuário que fez a solicitação
 * @param currency A currency que será retirada
 * @param account O address de destino do saque
 * @param amount A quantidade que será sacada
 */
export async function withdraw(this: CurrencyApi,
		user: User,
		currency: SC,
		account: string,
		amount: string
	): Promise<ObjectId> {

	/** O identificador único dessa operação */
	const opid = new ObjectId()

	// Adiciona o comando de withdraw na checklist
	await Checklist.findOneAndUpdate({
		userId: user.id
	}, {
		$push: {
			[`commands.withdraw.${currency}`]: {
				status: 'preparing',
				opid
			}
		}
	}, {
		upsert: true
	})

	// Adiciona a operação na Transactions
	const transaction = await new Transaction({
		_id: opid,
		user: user.id,
		type: 'send',
		currency,
		status: 'processing',
		account,
		amount,
		timestamp: new Date()
	}).save()

	try {
		/** Tenta atualizar o saldo */
		await user.balanceOps.add(currency, {
			opid,
			type: 'transaction',
			amount: - amount.replace(/^-/, '') // Garante que o amount será negativo
		})
	} catch(err) {
		if (err === 'NotEnoughFunds') {
			// Remove a transação da collection e o item da checklist
			await transaction.remove()
			await Checklist.updateOne({
				userId: user.id
			}, {
				$pull: {
					[`commands.withdraw.${currency}`]: { opid }
				}
			})
		}
		/** Da throw no erro independente de qual erro seja */
		throw err
	}

	/**
	 * Atualiza a operação na checklist para o status 'requested', que sinaliza
	 * para o withdraw_loop que os check iniciais (essa função) foram
	 * bem-sucedidos
	 */
	await Checklist.updateOne({
		userId: user.id,
		[`commands.withdraw.${currency}.opid`]: opid
	}, {
		$set: {
			[`commands.withdraw.${currency}.$.status`]: 'requested'
		}
	})

	/** Chama o método da currency para executar o withdraw */
	this._currencies[currency].withdraw()

	return opid
}
