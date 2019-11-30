import mongoose from 'mongoose'
import { sha512 } from 'js-sha512'
import { Person } from '../db/models/person/interface'
import { Pending } from '../db/models/person/currencies/interface'

export default class User {
	/**
	 * Cria o sha512 do salt com o password, seguindo o padrão do createUser
	 */
	private _hashPassword = (password: string): string =>
		sha512.create()
			.update(this.person.credentials.salt)
			.update(password)
			.hex()

	constructor(person: Person) {
		this.person = person
	}

	/**
	 * Documento do mongodb desta person, acessível publicamente
	 */
	person: Person

	/**
	 * Retorna o saldo de um usuário para determinada currency
	 */
	getBalance = (currency: string): number => this.person.currencies[currency].balance

	/**
	 * Retorna as accounts de um usuário para determinada currency
	 */
	getAccounts = (currency: string): string[] => this.person.currencies[currency].accounts

	/**
	 * Retorna o objectId do documento person
	 */
	getObjectId = (): Person['_id'] => this.person._id

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
	balanceOp = (() => {
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
		const add = async (currency: string, op: Pending): Promise<void> => {
			const balanceObj = `currencies.${currency}._balance`
	
			const response = await this.person.collection.findOneAndUpdate({
				_id: this.person._id,
				$expr: {
					$gte: [
						{ $add: [`$${balanceObj}.available`, op.amount] }, 0
					]
				}
			}, {
				$inc: {
					[`${balanceObj}.locked`]: Math.abs(op.amount),
					[`${balanceObj}.available`]: op.amount < 0 ? op.amount : 0
				},
				$push: {
					[`currencies.${currency}.pending`]: op
				}
			})
	
			if (!response.lastErrorObject.updatedExisting)
				throw 'NotEnoughFunds'
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
		const _getOpAmount = async (
			currency: string,
			opid: mongoose.Types.ObjectId
		): Promise<number> => {
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
			if (!operations[0] || typeof operations[0].amount != 'number')
				throw 'OperationNotFound'

			return operations[0].amount
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
			opid: mongoose.Types.ObjectId,
			opAmount: number,
			changeInAvailable: number
		): Promise<void> => {
			const balanceObj = `currencies.${currency}._balance`

			const response = await this.person.collection.findOneAndUpdate({
				_id: this.person._id,
				[`currencies.${currency}.pending.opid`]: opid
			}, {
				$inc: {
					[`${balanceObj}.locked`]: - Math.abs(opAmount),
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
			currency: string,
			opid: mongoose.Types.ObjectId
		): Promise<void> => {
			/**
			 * O amount da operação
			 */
			const amount: Pending['amount'] = await _getOpAmount(currency, opid)

			/**
			 * Calcula o quanto o campo 'available' deverá ser alterado para
			 * retornar os saldos ao estado original
			 */
			const changeInAvailable = amount < 0 ? Math.abs(amount) : 0

			/**
			 * Remove a operação pendente e volta os saldos ao estado original
			 */
			await _removeOperation(currency, opid, amount, changeInAvailable)
		}

		/**
		 * Completa uma operação pendente, atualizando os saldos e removendo a
		 * operation do array de 'pending'
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
			currency: string,
			opid: mongoose.Types.ObjectId
		): Promise<void> => {
			/**
			 * O amount da operação
			 */
			const amount: Pending['amount'] = await _getOpAmount(currency, opid)

			/**
			 * Calcula o quanto o campo 'available' deverá ser alterado para
			 * completar a operação
			 */
			const changeInAvailable = amount < 0 ? 0 : amount

			/**
			 * Remove a operação pendente e atualiza os saldos
			 */
			await _removeOperation(currency, opid, amount, changeInAvailable)
		}

		return {
			add,
			cancel,
			complete
		}
	})()
}
