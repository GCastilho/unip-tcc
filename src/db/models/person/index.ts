import mongoose, { Schema } from 'mongoose'
import currenciesSchema from './currencies'
import type { Person } from './interface'

/**
 * Schema da collection de usuários (people)
 */
const PersonSchema: Schema = new Schema({
	email: {
		type: String,
		trim: true,
		lowercase: true,
		unique: true,
		required: true,
	},
	credentials: {
		salt: {
			type: String,
			required: true
		},
		password_hash: {
			type: String,
			required: true
		}
	},
	currencies: currenciesSchema.obj
})

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
export default mongoose.model<Person>('Person', PersonSchema)
