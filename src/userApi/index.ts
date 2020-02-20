import randomstring from 'randomstring'
import { ObjectId } from 'mongodb'
import User, { hashPassword } from './user'
import Cookie from '../db/models/cookie'
import currencyApi from '../currencyApi'
import PersonModel from '../db/models/person'
import { Person } from '../db/models/person/interface'

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
export = class UserApi {
	/**
	 * Cria um novo usuário no database com as credenciais informadas
	 * 
	 * @throws ValidationError from mongoose.Error if document validation fails
	 * @returns The newly created document
	 */
	static async createUser(email: string, password: string): Promise<Person> {
		const salt = randomstring.generate({ length: 32 })
		const password_hash = hashPassword(salt, password)

		const person = await new PersonModel({
			email,
			credentials: {
				salt,
				password_hash
			}
		}).save()

		/**
		 * @todo Criar as accounts quando o e-mail for confirmado, não ao
		 * criar o usuário
		 */
		currencyApi.create_accounts(person._id)

		return person
	}

	/**
	 * Expõe vários métodos para procurar por um usuário e retornar uma
	 * instância da classe User com ele
	 */
	static findUser = class FindUser {
		/**
		 * Procura por um usuário usando o email informado
		 * 
		 * @returns A User class instance with the found user
		 * @throws 'UserNotFound'
		 */
		static async byEmail(email: string): Promise<User> {
			const person = await PersonModel.findOne({ email })
			if (!person) throw 'UserNotFound'
			return new User(person)
		}

		/**
		 * Procura por um usuário usando o ID informado
		 * 
		 * @returns A User class instance with the found user
		 * @throws 'UserNotFound'
		 */
		static async byId(id: ObjectId): Promise<User> {
			const person = await PersonModel.findById(id)
			if (!person) throw 'UserNotFound'
			return new User(person)
		}

		/**
		 * Procura por um usuário usando o cookie de sessionID informado
		 * 
		 * @returns A User class instance with the found user
		 * @throws 'CookieNotFound'
		 * @throws 'UserNotFound'
		 * @todo Checar se o Cookie não expirou antes de continuar
		 */
		static async byCookie(sessionID: string): Promise<User> {
			const cookie = await Cookie.findOne({ sessionID })
			if (!cookie) throw 'CookieNotFound'
			return this.byId(cookie.userId)
		}

		/**
		 * Procura por um usuário usando uma account informada
		 * 
		 * @param currency A currency que a account se refere
		 * @param account A account pertencente ao usuário
		 * @returns A User class instance with the found user
		 * @throws 'UserNotFound'
		 */
		static async byAccount(currency: string, account: string): Promise<User> {
			const person = await PersonModel.findOne({
				[`currencies.${currency}.accounts`]: account
			})
			if (!person) throw 'UserNotFound'
			return new User(person)
		}
	}
}
