import mongoose from 'mongoose'
import Person from '../db/models/person'
import Cookie from '../db/models/cookie'
import User from './user'

export default class FindUser {
	/**
	 * Procura por um usuário usando o email informado
	 * 
	 * @returns A User class instance with the found user
	 * @throws 'UserNotFound'
	 */
	byEmail = async (email: string): Promise<User> => {
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
	byId = async (id: mongoose.Types.ObjectId): Promise<User> => {
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
	byCookie = async (sessionID: string): Promise<User> => {
		const cookie = await Cookie.findOne({ sessionID })
		if (!cookie) throw 'CookieNotFound'
		return this.byId(cookie.personID)
	}
}
