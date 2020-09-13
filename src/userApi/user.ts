import { sha512 } from 'js-sha512'
import { ObjectId, Decimal128 } from 'mongodb'
import { detailsOf } from '../currencyApi'
import PersonSchema from '../db/models/person'
import type { Pending } from '../db/models/person/currencies/pending'
import type { Person } from '../db/models/person'
import type { SuportedCurrencies as SC } from '../currencyApi'

/**
 * Função para fazer o hash do password de um usuário
 *
 * @param salt O salt desse usuário
 * @param password O password desse usuário
 * @returns sha512 do salt + password
 */
export const hashPassword = (salt: string, password: string) =>
	sha512.create()
		.update(salt)
		.update(password)
		.hex()

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
 * Classe para métodos de manipulação de saldo da User
 */
class BalanceOps {
	/**
	 * Id da User dessa classe
	 */
	private id: User['id']

	constructor(id: User['id']) {
		this.id = id
	}

	/**
	 * Retorna o amount de uma operação DESSE usuário
	 *
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	private async getOpAmount(currency: SC, opid: ObjectId): Promise<Decimal128> {
		const operation = await this.get(currency, opid)
		return operation.amount
	}

	/**
	 * Remove uma operação do banco de dados, subtraindo o módulo do
	 * opAmount do campo locked e incrementando o campo 'available' com o
	 * valor passado em 'changeInAvailable'
	 *
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 * @param opAmount O amount bruto da operação
	 * @param changeInAvailable O valor que o campo available deve ser
	 * incrementado
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	private async remove(
		currency: SC,
		opid: ObjectId,
		opAmount: Decimal128,
		changeInAvailable: Decimal128|0,
		rfOpid?: ObjectId
	): Promise<void> {
		const balanceObj = `currencies.${currency}.balance`

		const response = await PersonSchema.findOneAndUpdate({
			_id: this.id,
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
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 * @param rfOpid O ID da operação que trancou essa pending
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	private async completeTotal(currency: SC, opid: ObjectId, rfOpid?: ObjectId): Promise<void> {
		/**
		 * O amount da operação
		 */
		const amount: Pending['amount'] = await this.getOpAmount(currency, opid)

		/**
		 * Calcula o quanto o campo 'available' deverá ser alterado para
		 * completar a operação
		 *
		 * NOTA: (Decimal128->number) > 0 PODE não ser preciso o suficiente
		 */
		const changeInAvailable = +amount < 0 ? 0 : amount

		/**
		 * Remove a operação pendente e atualiza os saldos
		 */
		await this.remove(currency, opid, amount, changeInAvailable, rfOpid)
	}

	/**
	 * Completa uma ordem pacialmente, liberando o saldo informado mas
	 * mantendo a ordem em aberto
	 *
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
	private async completePartial(
		currency: SC,
		opid: ObjectId,
		rfOpid: ObjectId,
		amount: Decimal128
	): Promise<void> {
		const opAmount = await this.getOpAmount(currency, opid)

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
		const response = await PersonSchema.findOneAndUpdate({
			_id: this.id,
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
										{ $add: ['$$this.amount', amount] }, 0
									]
								}, {
									$lte: [
										{ $add: ['$$this.amount', amount.abs()] }, 0
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
	 * @param currency A currency que a operação se refere
	 * @param pending O objeto da operação pendente que será adicionado
	 *
	 * @throws NotEnoughFunds Caso não haja saldo disponível (o campo
	 * 'available' do balance) para executar a operação
	 */
	async add(currency: SC, pending: PendingOp): Promise<void> {
		const balanceObj = `currencies.${currency}.balance`

		/** O middleware de findOneAndUpdate não é executado em um subdocumento */
		if (typeof pending.amount == 'string' || typeof pending.amount == 'number') {
			pending.amount = Decimal128.fromNumeric(pending.amount, detailsOf(currency).decimals)
		} else {
			pending.amount = pending.amount.truncate(detailsOf(currency).decimals)
		}

		const response = await PersonSchema.findOneAndUpdate({
			_id: this.id,
			$expr: {
				$gte: [
					{ $add: [`$${balanceObj}.available`, pending.amount] }, 0
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

		if (!response)
			throw 'NotEnoughFunds'
	}

	/**
	 * Retorna uma operação salva no documento desse usuário
	 *
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	async get(currency: string, opid: ObjectId): Promise<Pending> {
		// No primeiro item do array retornado pega o objeto 'operations'
		const [{ operations }] = await PersonSchema.aggregate([
			{
				$match: { _id: this.id }
			}, {
				$project: {
					operations: {
						$filter: {
							input: `$currencies.${currency}.pending`,
							as: 'operations',
							cond: {
								$eq: [ '$$operations.opid', opid ]
							}
						}
					}
				}
			}
		])
		if (!operations[0] || !(operations[0].amount instanceof Decimal128))
			throw 'OperationNotFound'

		return operations[0]
	}

	/**
	 * Cancela uma operação adicionada pelo 'addPending', voltando tudo ao
	 * seu estado original
	 *
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	async cancel(currency: SC, opid: ObjectId): Promise<void> {
		/**
		 * O amount da operação
		 */
		const amount: Pending['amount'] = await this.getOpAmount(currency, opid)

		/**
		 * Calcula o quanto o campo 'available' deverá ser alterado para
		 * retornar os saldos ao estado original
		 *
		 * NOTA: (Decimal128->number) > 0 PODE não ser preciso o suficiente
		 */
		const changeInAvailable = +amount < 0 ? amount.abs() : 0

		/**
		 * Remove a operação pendente e volta os saldos ao estado original
		 */
		await this.remove(currency, opid, amount, changeInAvailable)
	}

	/**
	 * Completa uma operação pendente, atualizando os saldos e removendo a
	 * operação do array de 'pending'
	 *
	 * @param currency A currency que a operação se refere
	 * @param opid O ObjectId que referencia o documento da operação em sua
	 * respectiva collection
	 * @param rfOpid O ID da operação que trancou essa pending
	 *
	 * @throws OperationNotFound if an operation was not found for THIS user
	 */
	async complete(currency: SC, opid: ObjectId, rfOpid?: ObjectId): Promise<void>

	/**
	 * Completa uma ordem pacialmente, liberando o saldo informado mas
	 * mantendo a ordem em aberto
	 *
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
	async complete(currency: SC, opid: ObjectId, rfOpid: ObjectId, amount: Decimal128): Promise<void>

	async complete(
		currency: SC,
		opid: ObjectId,
		rfOpid?: ObjectId,
		amount?: Decimal128
	): Promise<void> {
		if (amount) {
			if (!rfOpid) throw 'rfOpid needs to be informed to partially complete an operation'
			await this.completePartial(currency, opid, rfOpid, amount)
		} else {
			await this.completeTotal(currency, opid, rfOpid)
		}
	}

	/**
	 * Trava uma operação para que ela só possa ser completada por uma operação
	 * com um opid específico
	 * @param currency A currency da operação
	 * @param operation A operação pendente que está sendo travada
	 * @param opid O id da operação que está executando o lock
	 * @throws OperationNotFound if a pending unlocked operation was not found
	 */
	async lock(currency: SC, operation: ObjectId, opid: ObjectId) {
		const response = await PersonSchema.findOneAndUpdate({
			_id: this.id,
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
	 * @param currency A currency da operação
	 * @param operation A operação pendente que será destravada
	 * @param opid O id da operação que travou a pending
	 * @throws OperationNotFound if a pending locked operation was not found
	 */
	async unlock(currency: SC, operation: ObjectId, opid: ObjectId): Promise<void>
	/**
	 * Destrava uma operação pendente no modo inseguro, ou seja, sem a conferência
	 * de que o opid informado é o opid que requisitou o lock
	 * @param currency A currency da operação
	 * @param operation A operação pendente que será destravada
	 * @param force Indica que o destrave irá ser executado no modo inseguro
	 * @throws OperationNotFound if a pending operation was not found
	 */
	async unlock(currency: SC, operation: ObjectId, opid: any, force: true): Promise<void>
	async unlock(currency: SC, operation: ObjectId, opid: ObjectId|null, force?: true) {
		const query: {} = {
			_id: this.id,
			[`currencies.${currency}.pending.opid`]: operation
		}

		if (!force) {
			query[`currencies.${currency}.pending.locked.byOpid`] = opid
		}

		const response = await PersonSchema.findOneAndUpdate(query, {
			[`currencies.${currency}.pending.$.locked`]: {}
		}).select({ _id: true })

		if (!response) throw 'OperationNotFound'
	}
}

export default class User {
	/**
	 * Retorna a versão atualizada do documento desse usuário do database
	 */
	private async getPerson(projection?: any): Promise<Person> {
		const person = await PersonSchema.findById(this.id, projection)
		if (!person) throw `Person document for id '${this.id} not found in the database`
		return person
	}

	/**
	 * Retorna o sha512 do salt com o password desse usuário
	 */
	private async _hashPassword(password: string): Promise<string> {
		const { salt } = (await this.getPerson()).credentials
		return hashPassword(salt, password)
	}

	constructor(person: Person) {
		this.person = person
		this.id = person._id
		this.balanceOps = new BalanceOps(this.id)
	}

	/**
	 * Documento do mongodb desta person, acessível publicamente
	 */
	person: Person

	/**
	 * Identificador único do documento desse usuário no database
	 */
	id: Person['_id']

	/**
	 * Contém métodos para a manipulação de operações de mudança de saldo
	 *
	 * Todos os métodos são async safe
	 */
	balanceOps: BalanceOps

	/**
	 * Retorna os saldos de um usuário para determinada currency
	 * @param currency A currency que o saldo se refere
	 * @param asString Retorna os saldos como string ou Decimal128
	 */
	async getBalance(currency: SC, asString: true): Promise<{ available: string; locked: string }>
	async getBalance(currency: SC, asString?: false): Promise<{ available: Decimal128; locked: Decimal128 }>
	async getBalance(currency: SC, asString?: boolean) {
		const { available, locked } = (await this.getPerson({
			[`currencies.${currency}.balance`]: true
		})).currencies[currency].balance
		return asString ? {
			available: available.toFullString(),
			locked: locked.toFullString()
		} : {
			available,
			locked
		}
	}

	/**
	 * Retorna as accounts de um usuário para determinada currency
	 */
	async getAccounts(currency: SC): Promise<string[]> {
		return (await this.getPerson({
			[`currencies.${currency}.accounts`]: true
		})).currencies[currency].accounts
	}

	/**
	 * Retorna 'void' se o password informado é o password correto do usuário
	 *
	 * @throws InvalidPassword if password is invalid
	 */
	async checkPassword(password: string): Promise<void> {
		const password_hash = await this._hashPassword(password)
		if (password_hash != this.person.credentials.password_hash)
			throw 'InvalidPassword'
	}

	/**
	 * Atualiza o password do usuário com o password informado
	 *
	 * @returns The updated person object
	 */
	async changePassword(password: string): Promise<User> {
		this.person.credentials.password_hash = await this._hashPassword(password)
		await this.person.save()
		return this
	}
}
