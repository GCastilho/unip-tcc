import Person from '../db/models/person'
import Cookie from '../db/models/cookie'
import User from './user'
import { ObjectId } from 'mongodb'

export default class FindUser {
	/**
	 * Procura por um usuário usando o email informado
	 * 
	 * @returns A User class instance with the found user
	 * @throws 'UserNotFound'
	 */
	static async byEmail(email: string): Promise<User> {
		const person = await Person.findOne({ email })
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
		const person = await Person.findById(id)
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
		const person = await Person.findOne({
			[`currencies.${currency}.accounts`]: account
		})
		if (!person) throw 'UserNotFound'
		return new User(person)
	}
}
