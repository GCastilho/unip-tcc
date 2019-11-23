import { Document } from 'mongoose'
import { Currencies } from './currencies/interface'

export interface Person extends Document {
	email: string,
	credentials: {
		salt: string,
		password_hash: string
	},
	currencies: Currencies
}
