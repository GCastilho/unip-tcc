import { Decimal128, ObjectId } from 'mongodb'
import { Model, ClientSession } from 'mongoose'
import { currenciesObj } from '../../../libs/currencies'
import type { PersonDoc } from './schema'
import type { SuportedCurrencies as SC } from '../../../libs/currencies'
import type { Pending } from './currencies/pending'

/** Model compilado do schema da Person */
let Person: Model<PersonDoc>

/**
 * Inicializa o balanceOps, passando uma referência do PersonModel para a
 * utilização desse módulo
 *
 * @throws 'AlreadyInitialized' se for chamado quando o módulo já foi
 * inicializado
 */
export function init(model: Model<PersonDoc>) {
	if (typeof Person != 'undefined') throw 'AlreadyInitialized'
	Person = model
}

/**
 * Interface para operações de manipulação de saldo
 */
interface PendingOp extends Omit<Pending, 'amount'> {
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: Pending['amount']|string
}

/**
 * Remove uma operação do banco de dados, subtraindo o módulo do
 * opAmount do campo locked e incrementando o campo 'available' com o
 * valor passado em 'changeInAvailable'
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 * @param opAmount O amount bruto da operação
 * @param changeInAvailable O valor que o campo available deve ser
 * incrementado
 *
 * @throws OperationNotFound if an operation was not found for THIS user
 */
async function remove(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	opAmount: number,
	changeInAvailable: number,
	rfOpid?: ObjectId,
	session?: ClientSession
): Promise<void> {
	const balanceObj = `currencies.${currency}.balance`

	const response = await Person.findOneAndUpdate({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid,
		[`currencies.${currency}.pending.locked.byOpid`]: rfOpid
	}, {
		$inc: {
			[`${balanceObj}.locked`]: - Math.abs(opAmount),
			[`${balanceObj}.available`]: changeInAvailable
		},
		$pull: {
			[`currencies.${currency}.pending`]: { opid }
		}
	}).select({ _id: true })
		.session(session || null)

	if (!response)
		throw 'OperationNotFound'
}

/**
 * Completa uma operação pendente, atualizando os saldos e removendo a
 * operação do array de 'pending'
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 * @param rfOpid O ID da operação que trancou essa pending
 *
 * @throws OperationNotFound if an operation was not found for THIS user
 */
async function completeTotal(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId,
	session?: ClientSession
): Promise<void> {
	/**
	 * O amount da operação
	 */
	const { amount } = await get(userId, currency, opid, session)

	/**
	 * Calcula o quanto o campo 'available' deverá ser alterado para
	 * completar a operação
	 */
	const changeInAvailable = +amount < 0 ? 0 : amount

	/**
	 * Remove a operação pendente e atualiza os saldos
	 */
	await remove(userId, currency, opid, amount, changeInAvailable, rfOpid, session)
}

/**
 * Completa uma ordem pacialmente, liberando o saldo informado mas
 * mantendo a ordem em aberto
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que essa operação se refere
 * @param opid O identificador único dessa operação
 * @param rfOpid O opid de referência da operação que está parcialmente
 * completando essa pending
 * @param amount O valor que a ordem será parcialmente completa. Não pode
 * ter valor igualou maior que o módulo do valor da ordem
 *
 * @throws AmountOutOfRange if amount is greater or equal than
 * operation's amount
 * @throws OperationNotFound if the operation was not found for THIS user
 */
async function completePartial(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid: ObjectId,
	amount: number,
	session?: ClientSession
): Promise<void> {
	const { amount: opAmount } = await get(userId, currency, opid, session)

	/**
	 * Garante que o amount será positivo para uma ordem de redução de saldo
	 * e negativo para uma ordem de aumento de saldo
	 */
	if (+opAmount > 0) {
		amount = - Math.abs(amount)
	} else {
		amount = Math.abs(amount)
	}

	/**
	 * Subtrai o valor absoluto da ordem com o valor absoluto do amount
	 * para checar se o amount para completar a ordem é menor que o amount
	 * da ordem
	 *
	 * Esse if é só para ter uma mensagem de erro mais certa, pois o
	 * update não executa se o amount da ordem for menor ou igual ao
	 * amount fornecido
	 */
	if (Math.abs(opAmount) - Math.abs(amount) <= 0) throw {
		name: 'AmountOutOfRange',
		message: 'Amount provided is greater or equal than amount in order'
	}

	/**
	 * Atualiza os saldos e o amount da ordem, reduzindo-o junto com o
	 * locked e incrementando o amount available SE existir uma pending com
	 * o opid informado e pending.amount - amount > 0
	 */
	const response = await Person.findOneAndUpdate({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid,
		$or: [
			{ [`currencies.${currency}.pending.locked.byOpid`]: null },
			{ [`currencies.${currency}.pending.locked.byOpid`]: rfOpid }
		],
		$expr: {
			/** Checa se o amount da operação é maior que o amount informado */
			$reduce: {
				input: `$currencies.${currency}.pending`,
				initialValue: false,
				in: {
					$cond: {
						if: '$$value',
						then: true,
						else: {
							/**
							 * this.amount pode ser negativo ou positivo, por isso são
							 * duas possibilidades de testes
							 */
							$or: [{
								$gte: [
									{ $add: ['$$this.amount', amount]}, 0
								]
							}, {
								$lte: [
									{ $add: ['$$this.amount', Math.abs(amount)]}, 0
								]
							}]
						}
					}
				}
			}
		}
	}, {
		$inc: {
			[`currencies.${currency}.balance.available`]: opAmount > 0 ? Math.abs(amount) : 0,
			[`currencies.${currency}.balance.locked`]: - Math.abs(amount),
			[`currencies.${currency}.pending.$.amount`]: amount,
		},
		$push: {
			[`currencies.${currency}.pending.$.completions`]: rfOpid
		}
	}).select({ _id: true })
		.session(session || null)

	if (!response) throw 'OperationNotFound'
}

/**
 * Adiciona uma operação de mudança de saldo pendente no array 'pending'
 * da currency trava o saldo utilizado na operação
 *
 * Caso seja uma operação de redução de saldo e available - amount >= 0,
 * o valor de 'amount' será retirado de 'available' e adicionado em
 * 'locked'. Se a operação for de aumento de saldo, a única coisa que
 * será feita é aumentar o valor do locked
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param pending O objeto da operação pendente que será adicionado
 *
 * @throws NotEnoughFunds Caso não haja saldo disponível (o campo
 * 'available' do balance) para executar a operação
 */
export async function add(
	userId: PersonDoc['_id'],
	currency: SC,
	pending: PendingOp,
	session?: ClientSession
): Promise<void> {
	const balanceObj = `currencies.${currency}.balance`

	/**
	 * Faz a truncagem do amount, pois o middleware de findOneAndUpdate não é
	 * executado em um subdocumento
	 */
	const [integer, decimals] = pending.amount.toString().split('.')
	pending.amount = Number(`${integer}.${(decimals || '0').slice(0, currenciesObj[currency].decimals)}`)

	const response = await Person.findOneAndUpdate({
		_id: userId,
		$expr: {
			$gte: [
				{ $add: [`$${balanceObj}.available`, pending.amount]}, 0
			]
		}
	}, {
		$inc: {
			[`${balanceObj}.locked`]: Math.abs(pending.amount),
			[`${balanceObj}.available`]: +pending.amount < 0 ? pending.amount : 0
		},
		$push: {
			[`currencies.${currency}.pending`]: pending
		}
	}).select({ _id: true })
		.session(session || null)

	if (!response) throw 'NotEnoughFunds'
}

/**
 * Retorna uma operação salva no documento desse usuário
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 *
 * @throws 'OperationNotFound' if an operation was not found for THIS user
 */
export async function get(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	session?: ClientSession
): Promise<Pending> {
	const person = await Person.findOne({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid
	}, {
		[`currencies.${currency}.pending.$`]: 1
	}).session(session || null)
	if (!person) throw 'OperationNotFound'
	return person.currencies[currency].pending[0]
}

/**
 * Cancela uma operação adicionada pelo 'add', voltando tudo ao seu
 * estado original
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 *
 * @throws OperationNotFound if an operation was not found for THIS user
 */
export async function cancel(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	session?: ClientSession
): Promise<void> {
	/**
	 * O amount da operação
	 */
	const { amount } = await get(userId, currency, opid, session)

	/**
	 * Calcula o quanto o campo 'available' deverá ser alterado para
	 * retornar os saldos ao estado original
	 */
	const changeInAvailable = +amount < 0 ? Math.abs(amount) : 0

	/**
	 * Remove a operação pendente e volta os saldos ao estado original
	 */
	await remove(userId, currency, opid, amount, changeInAvailable, undefined, session)
}

/**
 * Completa uma operação pendente, atualizando os saldos e removendo a
 * operação do array de 'pending'
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 * @param rfOpid O ID da operação que trancou essa pending
 *
 * @throws OperationNotFound if an operation was not found for THIS user
 */
export async function complete(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId,
	amount?: undefined,
	session?: ClientSession
): Promise<void>

/**
 * Completa uma ordem pacialmente, liberando o saldo informado mas
 * mantendo a ordem em aberto
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que essa operação se refere
 * @param opid O identificador único dessa operação
 * @param rfOpid O opid de referência da operação que está parcialmente
 * completando essa pending
 * @param amount O valor que a ordem será parcialmente completa. Não pode
 * ter valor igualou maior que o módulo do valor da ordem
 *
 * @throws AmountOutOfRange if amount is greater or equal than
 * operation's amount
 * @throws OperationNotFound if the operation was not found for THIS user
 */
export async function complete(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid: ObjectId,
	amount: Decimal128,
	session?: ClientSession
): Promise<void>

export async function complete(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId,
	amount?: Decimal128,
	session?: ClientSession
): Promise<void> {
	if (amount) {
		if (!rfOpid) throw 'rfOpid needs to be informed to partially complete an operation'
		await completePartial(userId, currency, opid, rfOpid, +amount, session)
	} else {
		await completeTotal(userId, currency, opid, rfOpid, session)
	}
}
