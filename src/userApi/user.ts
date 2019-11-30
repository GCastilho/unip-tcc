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
	 * Adiciona uma operação de mudança de saldo pendente no array 'pending' da
	 * currency trava o saldo utilizado na operação
	 * 
	 * Caso seja uma operação de redução de saldo e available - amount >= 0, o
	 * valor de 'amount' será retirado de 'available' e adicionado em 'locked'.
	 * Se a operação for de aumento de saldo, a única coisa que será feita é
	 * aumentar o valor do locked
	 * 
	 * Essa função é async safe, ou seja, a operação é feita de forma atômica
	 * no banco de dados
	 * 
	 * @param currency A currency que a operação se refere
	 * @param op O objeto da operação pendente que será adicionado
	 * 
	 * @throws NotEnoughFunds Caso não haja saldo disponível (o campo
	 * 'available' do balance) para executar a operação
	 */
	addPending = async (currency: string, op: Pending): Promise<void> => {
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
}
