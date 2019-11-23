import randomstring from 'randomstring'
import { sha512 } from 'js-sha512'
import PersonModel from '../db/models/person'
import currencyApi from '../currencyApi'
import { Person } from '../db/models/person/interface'

class User {
	private person: Person

	/**
	 * Cria o sha512 do salt com o password, seguindo o padrão do person
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

	/**
	 * Cria um novo usuário no database com as credenciais informadas
	 * 
	 * @throws ValidationError from mongoose.Error if document validation fails
	 * @returns The newly created document
	 */
	async createUser (email: string, password: string): Promise<Person> {
		const salt = randomstring.generate({ length: 32 })
		const password_hash = sha512.create()
			.update(salt)
			.update(password)
			.hex()
		
		const person = await new PersonModel({
			email,
			credentials: {
				salt,
				password_hash
			},
			currencies: {}
		}).save()

		/**
		 * @todo Criar as accounts quando o e-mail for confirmado, não ao
		 * criar o usuário
		 */
		currencyApi.create_accounts(person._id)

		return person
	}
}

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
const userApi = new UserApi()
export = userApi
