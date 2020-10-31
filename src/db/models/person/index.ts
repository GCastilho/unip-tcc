import '../../../libs/extensions'
import mongoose from '../../mongoose'
import PersonSchema, { events as documentEvents } from './schema'
import { currencyNames } from '../../../libs/currencies'
import * as balanceOperations from './balancesOps'
import type { DocumentQuery, Model } from 'mongoose'
import type { PersonDoc as PersonDocument, Events } from './schema'

// Re-exporta a interface do documento da person
export type PersonDoc = PersonDocument

/** Interface do Model da Person, com os métodos estáticos do mesmo */
interface PersonModel extends Model<PersonDoc, typeof customQueries> {
	/** Métodos para a manipulação de operações de mudança de saldo */
	balanceOps: typeof balanceOperations

	/** Cria o documento de uma única pessoa e o retorna */
	createOne(email: string, password: string): Promise<PersonDocument>

	emit: <E extends keyof Events>(event: E, ...args: Parameters<Events[E]>) => boolean
	on: <E extends keyof Events>(
		event: E,
		fn: (...args: Parameters<Events[E]>) => void
	) => this
	once: <E extends keyof Events>(
		event: E,
		fn: (...args: Parameters<Events[E]>) => void
	) => this
}

/** Faz a balanceOps ser uma propriedade estática do model da Person */
PersonSchema.statics.balanceOps = balanceOperations

/** Queries personalidas da Person */
const customQueries = {
	// Retornar PersonDoc (1º arg) não está certo, pois ele retorna apenas parte do doc
	selectAccounts(this: DocumentQuery<PersonDoc|null, PersonDoc>,
		currencies = currencyNames
	) {
		this.select(currencies.map(currency => `currencies.${currency}.accounts`).join(' '))
		return this
	},
	selectBalances(this: DocumentQuery<PersonDoc|null, PersonDoc>,
		currencies = currencyNames
	) {
		this.select(currencies.map(currency => `currencies.${currency}.balance`).join(' '))
		return this
	},
}

// Adiciona a customQuery na query
PersonSchema.query = customQueries

// Insere o createOne nos statics do schema
PersonSchema.static('createOne', function(this: PersonModel,
	email: string,
	password: string
): ReturnType<PersonModel['createOne']> {
	return this.create({
		email, credentials: { password }
	})
})

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
const Person = mongoose.model<PersonDoc, PersonModel>('Person', PersonSchema)

// Passa a referência do model para o balanceOps
balanceOperations.init(Person)

// Retransmite todos os eventos de um documento no emitter do Model
documentEvents.onAny((event, args) => {
	Person.emit(event, ...args)
})

export default Person
