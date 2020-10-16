import randomstring from 'randomstring'
import { sha512 } from 'js-sha512'
import { Document, Schema } from '../../mongoose'

/**
 * Função para fazer o hash do password de um usuário
 *
 * @param salt O salt desse usuário
 * @param password O password desse usuário
 * @returns sha512 do salt + password
 */
function hashPassword(salt: string, password: string) {
	return sha512.create()
		.update(salt)
		.update(password)
		.hex()
}

export interface Credentials extends Document {
	/** O salt usado para fazer o hash do password */
	readonly salt: string
	/** Hash do salt + password */
	readonly password_hash: string
	/**
	 * Setter do password; atualizar essa propriedade causa o password_hash
	 * ser recalculado
	 */
	password: string
	/** Checa se o password informado é igual ao armazenado do documento */
	check(password: string): boolean
}

const CredentialsSchema = new Schema({
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
}, {
	_id: false
})

CredentialsSchema.virtual('password')
	.set(function(this: Credentials, password: string) {
		// @ts-expect-error Esse método é o único que pode setar o salt
		if (!this.salt) this.salt = randomstring.generate({ length: 32 })

		// @ts-expect-error Esse método é o único que pode atualizar o password_hash
		this.password_hash = hashPassword(this.salt, password)
	}).get(function(this: Credentials) {
		return this.password_hash
	})

CredentialsSchema.method('check', function(
	this: Credentials,
	password: string
): ReturnType<Credentials['check']> {
	return hashPassword(this.salt, password) == this.password_hash
})

export default CredentialsSchema
