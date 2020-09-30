import randomstring from 'randomstring'
import { ObjectId } from 'mongodb'
import Session from '../db/models/session'
import PersonModel from '../db/models/person'
import User, { hashPassword } from './user'
import { currencyNames } from '../libs/currencies'
import * as CurrencyApi from '../currencyApi'

/**
 * Cria um novo usuário no database com as credenciais informadas
 *
 * @throws ValidationError from mongoose.Error if document validation fails
 * @returns The User class instance of the new User
 */
export async function createUser(email: string, password: string): Promise<User> {
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
	const createAccounts = currencyNames
		.map(currency => CurrencyApi.createAccount(person._id, currency))

	/** Se múltiplas forem rejeitadas só irá mostrar o valor da primeira */
	await Promise.all(createAccounts).catch(err => {
		if (err != 'SocketDisconnected')
			console.error('Error creating account for new user', err)
	})

	return new User(person)
}

/**
 * Expõe vários métodos para procurar por um usuário e retornar uma
 * instância da classe User com ele
 */
export const findUser = {
	/**
	 * Procura por um usuário usando o email informado
	 *
	 * @returns A User class instance with the found user
	 * @throws 'UserNotFound'
	 */
	async byEmail(email: string): Promise<User> {
		const person = await PersonModel.findOne({ email })
		if (!person) throw 'UserNotFound'
		return new User(person)
	},

	/**
	 * Procura por um usuário usando o ID informado
	 *
	 * @returns A User class instance with the found user
	 * @throws 'UserNotFound'
	 */
	async byId(id: ObjectId): Promise<User> {
		const person = await PersonModel.findById(id)
		if (!person) throw 'UserNotFound'
		return new User(person)
	},

	/**
	 * Procura por um usuário usando o cookie de sessionId informado
	 * @param sessionId O cookie 'sessionId' do usuário
	 *
	 * @returns A User class instance with the found user
	 * @throws 'CookieNotFound'
	 * @throws 'UserNotFound'
	 *
	 * @todo Checar se o Cookie não expirou antes de continuar
	 */
	async byCookie(sessionId: string): Promise<User> {
		const session = await Session.findOne({ sessionId })
		if (!session) throw 'CookieNotFound'
		return this.byId(session.userId)
	},

	/**
	 * Procura por um usuário usando o token informado
	 * @param token O token do usuário
	 *
	 * @returns A User class instance with the found user
	 * @throws 'TokenNotFound'
	 * @throws 'UserNotFound'
	 *
	 * @todo Checar se o Token não expirou antes de continuar
	 */
	async byToken(token: string): Promise<User> {
		const session = await Session.findOne({ token })
		if (!session) throw 'TokenNotFound'
		return this.byId(session.userId)
	},

	/**
	 * Procura por um usuário usando uma account informada
	 *
	 * @param currency A currency que a account se refere
	 * @param account A account pertencente ao usuário
	 * @returns A User class instance with the found user
	 * @throws 'UserNotFound'
	 */
	async byAccount(currency: string, account: string): Promise<User> {
		const person = await PersonModel.findOne({
			[`currencies.${currency}.accounts`]: account
		})
		if (!person) throw 'UserNotFound'
		return new User(person)
	}
}
