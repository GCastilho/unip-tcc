import { Document } from 'mongoose'
import { ObjectId } from 'mongodb'
import { Currencies } from './currencies/interface'

export interface Person extends Document {
	_id: ObjectId,
	/** O email do usuário */
	email: string,
	credentials: {
		/** O salt usado para fazer o hash do password */
		salt: string,
		/** Hash do salt + password */
		password_hash: string
	},
	currencies: Currencies
}
