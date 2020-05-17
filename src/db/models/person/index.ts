import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema } from '../../mongoose'
import currenciesSchema from './currencies'
import type { Currencies } from './currencies'

/**
 * Interface do documento 'person', da collection 'people', que contém
 * informações relacionadas ao usuários
 */
export interface Person extends Document {
	_id: ObjectId
	/** O email do usuário */
	email: string
	credentials: {
		/** O salt usado para fazer o hash do password */
		salt: string
		/** Hash do salt + password */
		password_hash: string
	}
	currencies: Currencies
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
			required: true,
			validate: {
				validator: v => v.length >= 32,
				message: props => `salt can not have length less than 32 characters, found ${props.value.length}`
			}
		},
		password_hash: {
			type: String,
			required: true,
			validate: {
				validator: v => v.length >= 128,
				message: props => `password_hash can not have length less than 128 characters, found ${props.value.length}`
			}
		}
	},
	currencies: currenciesSchema.obj
})

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
export default mongoose.model<Person>('Person', PersonSchema)
