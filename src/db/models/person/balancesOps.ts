import { Model } from 'mongoose'
import { Decimal128, ObjectId } from 'mongodb'
import { currenciesObj } from '../../../libs/currencies'
import type { Person } from './index'
import type { SuportedCurrencies as SC } from '../../../libs/currencies'
import type { Pending } from './currencies/pending'

/** Model compilado do schema da Person */
let PersonDoc: Model<Person>

/**
 * Inicializa o balanceOps, passando uma referência do PersonModel para a
 * utilização desse módulo
 *
 * @throws 'AlreadyInitialized' se for chamado quando o módulo já foi
 * inicializado
 */
export function init(model: Model<Person>) {
	if (typeof PersonDoc != 'undefined') throw 'AlreadyInitialized'
	PersonDoc = model
}

/**
 * Interface para operações de manipulação de saldo
 */
interface PendingOp extends Omit<Pending, 'amount'> {
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: Pending['amount']|number|string
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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	opAmount: Decimal128,
	changeInAvailable: Decimal128|0,
	rfOpid?: ObjectId
): Promise<void> {
	const balanceObj = `currencies.${currency}.balance`

	const response = await PersonDoc.findOneAndUpdate({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid,
		[`currencies.${currency}.pending.locked.byOpid`]: rfOpid
	}, {
		$inc: {
			[`${balanceObj}.locked`]: opAmount.abs().opposite(),
			[`${balanceObj}.available`]: changeInAvailable
		},
		$pull: {
			[`currencies.${currency}.pending`]: { opid }
		}
	}).select({ _id: true })

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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId
): Promise<void> {
	/**
	 * O amount da operação
	 */
	const { amount } = await get(userId, currency, opid)

	/**
	 * Calcula o quanto o campo 'available' deverá ser alterado para
	 * completar a operação
	 */
	const changeInAvailable = +amount < 0 ? 0 : amount

	/**
	 * Remove a operação pendente e atualiza os saldos
	 */
	await remove(userId, currency, opid, amount, changeInAvailable, rfOpid)
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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid: ObjectId,
	amount: Decimal128
): Promise<void> {
	const { amount: opAmount } = await get(userId, currency, opid)

	/**
	 * Garante que o amount será positivo para uma ordem de redução de saldo
	 * e negativo para uma ordem de aumento de saldo
	 */
	if (+opAmount > 0) {
		amount = amount.abs().opposite()
	} else {
		amount = amount.abs()
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
	if (+opAmount.abs() - +amount.abs() <= 0) throw {
		name: 'AmountOutOfRange',
		message: 'Amount provided is greater or equal than amount in order'
	}

	/**
	 * Atualiza os saldos e o amount da ordem, reduzindo-o junto com o
	 * locked e incrementando o amount available SE existir uma pending com
	 * o opid informado e pending.amount - amount > 0
	 */
	const response = await PersonDoc.findOneAndUpdate({
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
									{ $add: ['$$this.amount', amount.abs()]}, 0
								]
							}]
						}
					}
				}
			}
		}
	}, {
		$inc: {
			[`currencies.${currency}.balance.available`]: +opAmount > 0 ? amount.abs() : 0,
			[`currencies.${currency}.balance.locked`]: amount.abs().opposite(),
			[`currencies.${currency}.pending.$.amount`]: amount,
		},
		$push: {
			[`currencies.${currency}.pending.$.completions`]: rfOpid
		}
	}).select({ _id: true })

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
	userId: Person['_id'],
	currency: SC,
	pending: PendingOp
): Promise<void> {
	const balanceObj = `currencies.${currency}.balance`

	/**
	 * Faz a truncagem do amount, pois o middleware de findOneAndUpdate não é
	 * executado em um subdocumento
	 */
	if (typeof pending.amount == 'string' || typeof pending.amount == 'number') {
		pending.amount = Decimal128.fromNumeric(pending.amount, currenciesObj[currency].decimals)
	} else {
		pending.amount = pending.amount.truncate(currenciesObj[currency].decimals)
	}

	const response = await PersonDoc.findOneAndUpdate({
		_id: userId,
		$expr: {
			$gte: [
				{ $add: [`$${balanceObj}.available`, pending.amount]}, 0
			]
		}
	}, {
		$inc: {
			[`${balanceObj}.locked`]: pending.amount.abs(),
			[`${balanceObj}.available`]: +pending.amount < 0 ? pending.amount : 0
		},
		$push: {
			[`currencies.${currency}.pending`]: pending
		}
	}).select({ _id: true })

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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId
): Promise<Pending> {
	const person = await PersonDoc.findOne({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid
	}, {
		[`currencies.${currency}.pending.$.opid`]: 1
	})
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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId
): Promise<void> {
	/**
	 * O amount da operação
	 */
	const { amount } = await get(userId, currency, opid)

	/**
	 * Calcula o quanto o campo 'available' deverá ser alterado para
	 * retornar os saldos ao estado original
	 */
	const changeInAvailable = +amount < 0 ? amount.abs() : 0

	/**
	 * Remove a operação pendente e volta os saldos ao estado original
	 */
	await remove(userId, currency, opid, amount, changeInAvailable)
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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId
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
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid: ObjectId,
	amount: Decimal128
): Promise<void>

export async function complete(
	userId: Person['_id'],
	currency: SC,
	opid: ObjectId,
	rfOpid?: ObjectId,
	amount?: Decimal128
): Promise<void> {
	if (amount) {
		if (!rfOpid) throw 'rfOpid needs to be informed to partially complete an operation'
		await completePartial(userId, currency, opid, rfOpid, amount)
	} else {
		await completeTotal(userId, currency, opid, rfOpid)
	}
}

/**
 * Trava uma operação para que ela só possa ser completada por uma operação
 * com um opid específico
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency da operação
 * @param operation A operação pendente que está sendo travada
 * @param opid O id da operação que está executando o lock
 * @throws OperationNotFound if a pending unlocked operation was not found
 */
export async function lock(
	userId: Person['_id'],
	currency: SC,
	operation: ObjectId,
	opid: ObjectId
) {
	const response = await PersonDoc.findOneAndUpdate({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: operation,
		[`currencies.${currency}.pending.locked.byOpid`]: null
	}, {
		[`currencies.${currency}.pending.$.locked.byOpid`]: opid,
		[`currencies.${currency}.pending.$.locked.timestamp`]: new Date()
	}).select({ _id: true })

	if (!response) throw 'OperationNotFound'
}

/**
 * Destrava uma operação que foi previamente travada
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency da operação
 * @param operation A operação pendente que será destravada
 * @param opid O id da operação que travou a pending
 * @throws OperationNotFound if a pending locked operation was not found
 */
export async function unlock(
	userId: Person['_id'],
	currency: SC,
	operation: ObjectId,
	opid: ObjectId
): Promise<void>

/**
 * Destrava uma operação pendente no modo inseguro, ou seja, sem a conferência
 * de que o opid informado é o opid que requisitou o lock
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency da operação
 * @param operation A operação pendente que será destravada
 * @param force Indica que o destrave irá ser executado no modo inseguro
 * @throws OperationNotFound if a pending operation was not found
 */
export async function unlock(
	userId: Person['_id'],
	currency: SC,
	operation: ObjectId,
	opid: null,
	force: true
): Promise<void>

export async function unlock(
	userId: Person['_id'],
	currency: SC,
	operation: ObjectId,
	opid: ObjectId|null,
	force?: true
) {
	const query: Record<string, unknown> = {
		_id: userId,
		[`currencies.${currency}.pending.opid`]: operation
	}

	if (!force) {
		query[`currencies.${currency}.pending.locked.byOpid`] = opid
	}

	const response = await PersonDoc.findOneAndUpdate(query, {
		[`currencies.${currency}.pending.$.locked`]: {}
	}).select({ _id: true })

	if (!response) throw 'OperationNotFound'
}
