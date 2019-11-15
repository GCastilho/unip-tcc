import mongoose, { Schema, Document } from 'mongoose'
import currenciesSchema, { CurrenciesSchema } from './currencies'

interface Person extends Document {
	email: string,
	credentials: {
		salt: string,
		password_hash: string
	},
	currencies: CurrenciesSchema
}

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
	currencies: currenciesSchema
})

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
export = mongoose.model<Person>('Person', PersonSchema)
