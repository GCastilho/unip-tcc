import { ObjectId, Decimal128 } from 'mongodb'
import { sha512 } from 'js-sha512'
import { Person } from '../db/models/person/interface'
import { Pending } from '../db/models/person/currencies/interface'
import { SuportedCurrencies as SC } from '../currencyApi/currencyApi'

/**
 * Workaraound da dependência circular com a currencyApi, em que esse módulo
 * precisa da _instância_ da currencyApi e a currencyApi precisa desse módulo
 * 
 * Poderá ser facilmente substituído pelo statment abaixo uma vez que ele for
 * implementado no typescript na versão 3.8
 * 
 * @see https://github.com/tc39/proposal-top-level-await
 * @see https://github.com/microsoft/TypeScript/issues/25988
 */
// const currencyApi = await import('../currencyApi')
let currencyApi
setImmediate(async () => {
	currencyApi = await import('../currencyApi')
	currenciesInfo = (() =>
		currencyApi.currenciesDetailed.reduce((acc, cur) => ({
			...acc,
			[cur.name]: {
				decimals: cur.decimals
			}
		}), {} as currenciesInfo)
	)()
})
// import currencyApi from '../currencyApi'

let currenciesInfo: currenciesInfo
type currenciesInfo = {
	[key in SC]: {
		decimals: number
	}
}

/**
 * Interface utilizada pela balanceOps para operações de manipulação de saldo
 */
interface PendingOp {
	/**
	 * Referencia ao objectId da operação em sua respectiva collection
	 */
	opid: ObjectId,
	/**
	 * O tipo da operação, para identificar em qual collection ela está
	 */
	type: string,
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: number|string
}

export default class User {
	/**
	 * Cria o sha512 do salt com o password, seguindo o padrão do createUser
	 */
	private _hashPassword = (password: string): string =>
		sha512.create()
			.update(this.person.credentials.salt)
			.update(password)
			.hex()

	// Add decription; change name? Nota: O typescript não checa o retorno disso
	private _currenciesInfo: currenciesInfo = currenciesInfo

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
	 * Retorna o saldo de um usuário para determinada currency
	 */
	getBalance = (currency: string): number => this.person.currencies[currency].balance.available

	/**
	 * Retorna as accounts de um usuário para determinada currency
	 */
	getAccounts = (currency: string): string[] => this.person.currencies[currency].accounts

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
	changePassword = async (password: string): Promise<Person> => {
		this.person.credentials.password_hash = this._hashPassword(password)
		await this.person.save()
		return this.person
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
				amount: Decimal128.fromNumeric(op.amount, this._currenciesInfo[currency].decimals)
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
			// No primeiro item do array retornado pega o objeto 'operations'
			const [{ operations }] = await this.person.collection.aggregate([
				{
					$match: { _id: this.person._id }
				}, {
					$limit: 1
				}, {
					$project: {
						operations: {
							$filter: {
								input: `$currencies.${currency}.pending`,
								as: 'operations',
								cond: {
									$eq: [ `$$operations.opid`, opid ]
								}
							}
						}
					}
				}
			]).toArray()
			if (!operations[0] || !(operations[0].amount instanceof Decimal128))
				throw 'OperationNotFound'

			return operations[0]
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
		const _getOpAmount = async (currency: SC, opid: ObjectId)
		:Promise<Decimal128> => {
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
		 * incrementado
		 * 
		 * @throws OperationNotFound if an operation was not found for THIS user
		 */
		const _removeOperation = async(
			currency: string,
			opid: ObjectId,
			opAmount: Decimal128,
			changeInAvailable: Decimal128
		): Promise<void> => {
			const balanceObj = `currencies.${currency}.balance`

			const response = await this.person.collection.findOneAndUpdate({
				_id: this.person._id,
				[`currencies.${currency}.pending.opid`]: opid
			}, {
				$inc: {
					[`${balanceObj}.locked`]: - opAmount.abs(),
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
			const changeInAvailable = +amount < 0 ? amount.abs() : Decimal128.fromNumeric(0)

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
			const changeInAvailable = +amount < 0 ? Decimal128.fromNumeric(0) : amount

			/**
			 * Remove a operação pendente e atualiza os saldos
			 */
			await _removeOperation(currency, opid, amount, changeInAvailable)
		}

		return {
			add,
			cancel,
			complete,
			get
		}
	})()
}