import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema, Model } from '../../mongoose'
import currenciesSchema from './currencies'
import credentialsSchema from './credentials'
import type { Currencies } from './currencies'
import type { Credentials } from './credentials'

/**
 * Interface do documento 'person', da collection 'people', que contém
 * informações relacionadas ao usuários
 */
export interface Person extends Document {
	_id: ObjectId
	/** O email do usuário */
	email: string
	/** Sub-documento de credenciais */
	credentials: Credentials
	/** Informações de currencies desse usuário */
	currencies: Currencies
}

/**
 * Schema do documento de usuários
 */
const PersonSchema = new Schema({
	email: {
		type: String,
		trim: true,
		lowercase: true,
		unique: true,
		required: true,
	},
	credentials: credentialsSchema,
	currencies: currenciesSchema
})

PersonSchema.pre('validate', function(this: Person) {
	// Ao criar o documento, props de sub-schemas serão undefined
	if (!this.isNew) return
	if (typeof this.currencies == 'undefined')
		// @ts-expect-error Mongoose irá automaticamente preencher o subdocumento
		this.currencies = {}
	if (typeof this.credentials == 'undefined')
		// @ts-expect-error Mongoose irá automaticamente preencher o subdocumento
		this.credentials = {}
})

import * as balanceOperations from './balancesOps'

/** Interface do Model da Person, com os métodos estáticos do mesmo */
interface PersonModel extends Model<Person> {
	balanceOps: typeof balanceOperations
}

/** Faz a balanceOps ser uma propriedade estática do model da Person */
PersonSchema.statics.balanceOps = balanceOperations

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
const PersonModel = mongoose.model<Person, PersonModel>('Person', PersonSchema)

// Passa a referência do model para o balanceOps
balanceOperations.init(PersonModel)

export default PersonModel

export * as balanceOperations from './balancesOps'
