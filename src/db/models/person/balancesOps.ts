import { ObjectId, Decimal128 } from 'mongodb'
import { Model, ClientSession } from 'mongoose'
import { truncateAmount } from '../../../libs/currencies'
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
	session?: ClientSession
): Promise<void> {
	const balanceObj = `currencies.${currency}.balance`

	const response = await Person.findOneAndUpdate({
		_id: userId,
		[`currencies.${currency}.pending.opid`]: opid
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
 *
 * @throws OperationNotFound if an operation was not found for THIS user
 */
async function completeTotal(
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
	 * completar a operação
	 */
	const changeInAvailable = +amount < 0 ? 0 : amount

	/**
	 * Remove a operação pendente e atualiza os saldos
	 */
	await remove(userId, currency, opid, amount, changeInAvailable, session)
}

/**
 * Completa uma ordem pacialmente, liberando o saldo informado mas
 * mantendo a ordem em aberto
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que essa operação se refere
 * @param opid O identificador único dessa operação
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
	amount: number,
	session?: ClientSession,
): Promise<void> {
	const { amount: opAmount } = await get(userId, currency, opid, session)

	/**
	 * Garante que o amount será positivo para uma ordem de redução de saldo
	 * e negativo para uma ordem de aumento de saldo
	 */
	if (opAmount > 0) {
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
	pending.amount = truncateAmount(pending.amount, currency)
	const amount = Decimal128.fromNumeric(pending.amount)

	const response = await Person.findOneAndUpdate({
		_id: userId,
		$expr: {
			$gte: [
				{ $add: [`$${balanceObj}.available`, amount]}, 0
			]
		}
	}, {
		$inc: {
			[`${balanceObj}.locked`]: amount.abs(),
			[`${balanceObj}.available`]: pending.amount < 0 ? amount : 0
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
	await remove(userId, currency, opid, amount, changeInAvailable, session)
}

/**
 * Completa uma operação pendente com o amount informado. Se nenhum amount for
 * informado a operação será completada totalmente.
 *
 * Ao executar, os saldos serão atualizados e se a ordem foi completada
 * totalmente ela será removida do array de 'pending'
 *
 * @param userId O _id do documento desse usuário
 * @param currency A currency que a operação se refere
 * @param opid O ObjectId que referencia o documento da operação em sua
 * respectiva collection
 * @param session A client session, caso essa operação deva pertencer a uma
 * @param amount O valor que a ordem será completa. Se não for informado irá
 * completar a ordem totalmente
 *
 * @throws 'OperationNotFound' if an operation was not found for THIS user
 */
export async function complete(
	userId: PersonDoc['_id'],
	currency: SC,
	opid: ObjectId,
	session?: ClientSession,
	amount?: number,
): Promise<void> {
	if (amount) {
		const { amount: opAmount } = await get(userId, currency, opid, session)
		// Checa se o amount informado completa a ordem total ou parcialmente
		if (Math.abs(opAmount) == Math.abs(amount)) {
			await completeTotal(userId, currency, opid, session)
		} else {
			await completePartial(userId, currency, opid, amount, session)
		}
	} else {
		await completeTotal(userId, currency, opid, session)
	}
}
