import PersonModel from '../db/models/person'
import { Person } from '../db/models/person/interface'
import { sha512 } from 'js-sha512'

class User {
	private person: Person

	/**
	 * Cria o sha512 do password com o salt, seguindo o padrão do person
	 */
	private _hashPassword = (password: string): string =>
		sha512.create()
			.update(this.person.credentials.salt)
			.update(password)
			.hex()

	constructor(person: any) {
		this.person = person
	}

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
		if (typeof password != 'string') throw 'InvalidFunctionCall'

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
		if (typeof password != 'string') throw 'InvalidFunctionCall'

		const password_hash = this._hashPassword(password)
		this.person.credentials.password_hash = password_hash
		await this.person.save()
		return this.person
	}
}

class UserApi {
	/**
	 * Retorna uma instância de um usuário, com métodos para acessar e modificar
	 * dados do mesmo no database
	 * 
	 * @throws UserNotFound If no user found for given email
	 */
	user = (email: string): Promise<User> => {
		return PersonModel.findOne({ email }).then(person => {
			if (!person) throw 'UserNotFound'
			return new User(person)
		}).catch(err => {
			throw err
		})
	}
}

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
const userApi = new UserApi()
export = userApi
