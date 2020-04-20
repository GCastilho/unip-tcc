import { sha512 } from 'js-sha512'
import { ObjectId, Decimal128 } from 'mongodb'
import * as CurrencyApi from '../currencyApi'
import type { Pending } from '../db/models/person/currencies/pending'
import type { Person } from '../db/models/person'
import type { SuportedCurrencies as SC } from '../currencyApi'

/**
 * Interface utilizada pela balanceOps para operações de manipulação de saldo
 */
interface PendingOp {
	/**
	 * Referencia ao objectId da operação em sua respectiva collection
	 */
	opid: ObjectId
	/**
	 * O tipo da operação, para identificar em qual collection ela está
	 */
	type: Pending['type']
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: number|string
}

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

export default class User {
	/**
	 * Retorna o sha512 do salt com o password desse usuário
	 */
	private _hashPassword = (password: string): string =>
		hashPassword(this.person.credentials.salt, password)

	constructor(person: Person) {
		this.person = person
		this.id = person._id
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
	 * Retorna os saldos de um usuário para determinada currency
	 * @param currency A currency que o saldo se refere
	 * @param asString Retorna os saldos como string ou Decimal128
	 */
	getBalance(currency: SC, asString: true): { available: string; locked: string }
	getBalance(currency: SC, asString?: false): { available: Decimal128; locked: Decimal128 }
	getBalance(currency: SC, asString?: boolean) {
		const { available, locked } = this.person.currencies[currency].balance
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
	getAccounts = (currency: SC): string[] => this.person.currencies[currency].accounts

	/**
	 * Retorna 'void' se o password informado é o password correto do usuário
	 *
	 * @throws InvalidPassword if password is invalid
	 */
	checkPassword = (password: string): void => {
		const password_hash = this._hashPassword(password)
		if (password_hash != this.person.credentials.password_hash)
			throw 'InvalidPassword'
	}

	/**
	 * Atualiza o password do usuário com o password informado
	 *
	 * @returns The updated person object
	 */
	changePassword = async (password: string): Promise<User> => {
		this.person.credentials.password_hash = this._hashPassword(password)
		await this.person.save()
		return this
	}

	/**
	 * Contém métodos para a manipulação de operações de mudança de saldo
	 *
	 * Todos os métodos são async safe
	 */
	balanceOps = (() => {
		/**
		 * Adiciona uma operação de mudança de saldo pendente no array 'pending'
		 * da currency trava o saldo utilizado na operação
		 *
		 * Caso seja uma operação de redução de saldo e available - amount >= 0,
		 * o valor de 'amount' será retirado de 'available' e adicionado em
		 * 'locked'. Se a operação for de aumento de saldo, a única coisa que
		 * será feita é aumentar o valor do locked
		 *
		 * Essa função é async safe, ou seja, a operação é feita de forma
		 * atômica no banco de dados
		 *
		 * @param currency A currency que a operação se refere
		 * @param op O objeto da operação pendente que será adicionado
		 *
		 * @throws NotEnoughFunds Caso não haja saldo disponível (o campo
		 * 'available' do balance) para executar a operação
		 */
		const add = async (currency: SC, op: PendingOp): Promise<void> => {
			const balanceObj = `currencies.${currency}.balance`

			const pending: Pending = {
				opid: op.opid,
				type: op.type,
				amount: Decimal128.fromNumeric(op.amount, CurrencyApi.detailsOf(currency).decimals)
			}

			const response = await this.person.collection.findOneAndUpdate({
				_id: this.person._id,
				$expr: {
					$gte: [
						{ $add: [`$${balanceObj}.available`, pending.amount] }, 0
					]
				}
			}, {
				$inc: {
					[`${balanceObj}.locked`]: pending.amount.abs(),
					[`${balanceObj}.available`]: op.amount < 0 ? pending.amount : 0
				},
				$push: {
					[`currencies.${currency}.pending`]: pending
				}
			})

			if (!response.lastErrorObject.updatedExisting)
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
		const get = async (
			currency: string,
			opid: ObjectId
		): Promise<Pending> => {
			type Operations = { pending?: Pending }[]
			const [{ pending }]: Operations = await this.person.collection.aggregate([
				{
					$match: { _id: this.person._id }
				}, {
					$project: {
						_id: false,
						pending: {
							$filter: {
								input: `$currencies.${currency}.pending`,
								as: 'pending',
								cond: { $eq: [ '$$pending.opid', opid ] }
							}
						}
					}
				}, {
					$project: {
						pending: { $arrayElemAt: [ '$pending', 0] }
					}
				}
			]).toArray()

			if (!pending)
				throw 'OperationNotFound'

			return pending
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
		const _getOpAmount = async (currency: SC, opid: ObjectId): Promise<Decimal128> => {
			const operation = await get(currency, opid)
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
		 * incrementado; Embora suporte, esteja ciênte que a precisão do number
		 * é extremamente limitada, use com cautela
		 *
		 * @throws OperationNotFound if an operation was not found for THIS user
		 */
		const _removeOperation = async (
			currency: SC,
			opid: ObjectId,
			opAmount: Decimal128,
			changeInAvailable: number|Decimal128
		): Promise<void> => {
			const balanceObj = `currencies.${currency}.balance`

			const response = await this.person.collection.findOneAndUpdate({
				_id: this.person._id,
				[`currencies.${currency}.pending.opid`]: opid
			}, {
				$inc: {
					[`${balanceObj}.locked`]: opAmount.abs().opposite(),
					[`${balanceObj}.available`]: changeInAvailable
				},
				$pull: {
					[`currencies.${currency}.pending`]: { opid }
				}
			})

			if (!response)
				throw 'OperationNotFound'
		}

		/**
		 * Cancela uma operação adicionada pelo 'addPending', voltando tudo ao
		 * seu estado original
		 *
		 * Essa função é async safe
		 *
		 * @param currency A currency que a operação se refere
		 * @param opid O ObjectId que referencia o documento da operação em sua
		 * respectiva collection
		 *
		 * @throws OperationNotFound if an operation was not found for THIS user
		 */
		const cancel = async (
			currency: SC,
			opid: ObjectId
		): Promise<void> => {
			/**
			 * O amount da operação
			 */
			const amount: Pending['amount'] = await _getOpAmount(currency, opid)

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
			await _removeOperation(currency, opid, amount, changeInAvailable)
		}

		/**
		 * Completa uma operação pendente, atualizando os saldos e removendo a
		 * operação do array de 'pending'
		 *
		 * Essa função é async safe
		 *
		 * @param currency A currency que a operação se refere
		 * @param opid O ObjectId que referencia o documento da operação em sua
		 * respectiva collection
		 *
		 * @throws OperationNotFound if an operation was not found for THIS user
		 */
		const complete = async (
			currency: SC,
			opid: ObjectId
		): Promise<void> => {
			/**
			 * O amount da operação
			 */
			const amount: Pending['amount'] = await _getOpAmount(currency, opid)

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
			await _removeOperation(currency, opid, amount, changeInAvailable)
		}

		/**
		 * Contém métodos para manipulação de operações que parcialmente completam
		 * uma operação pendente
		 */
		const partials = {
			/**
			 * Completa uma ordem pacialmente, liberando o saldo informado mas
			 * mantendo a ordem em aberto
			 *
			 * @param currency A currency que essa operação se refere
			 * @param opid O identificador único dessa operação
			 * @param amount O valor que a ordem será parcialmente completa. Não pode
			 * ter valor igualou maior que o módulo do valor da ordem
			 * @param rfOpid O opid de referência da operação que está parcialmente
			 * completando essa pending
			 *
			 * @throws AmountOutOfRange if amount is greater or equal than
			 * operation's amount
			 * @throws OperationNotFound if the operation was not found for THIS user
			 */
			complete: async (
				currency: SC,
				opid: ObjectId,
				amount: Decimal128,
				rfOpid: ObjectId
			): Promise<void> => {
				const opAmount = await _getOpAmount(currency, opid)

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
				const response = await this.person.collection.findOneAndUpdate({
					_id: this.id,
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
				})

				if (!response.lastErrorObject.updatedExisting) throw 'OperationNotFound'
			},

			/**
			 * Retorna um array com a lista de opids das ordens que parcialmente
			 * completaram uma operação
			 *
			 * @param currency A currency que essa operação se refere
			 * @param opid O identificador único dessa operação
			 */
			get: async (currency: SC, opid: ObjectId): Promise<ObjectId[]|undefined> => {
				const pending = await get(currency, opid)
				return pending.completions
			}
		}

		return {
			add,
			cancel,
			complete,
			partials,
			get
		}
	})()
}
