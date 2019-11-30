import { Document, Schema } from 'mongoose'
import { Currencies } from './currencies/interface'

export interface Person extends Document {
	_id: Schema.Types.ObjectId,
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
