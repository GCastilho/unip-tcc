import { Schema } from 'mongoose'
import currenciesSchema from './currencies'

/**
 * Schema da collection de usuários (people)
 */
export const PersonSchema: Schema = new Schema({
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
	currencies: currenciesSchema
})
