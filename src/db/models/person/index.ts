import mongoose, { Model } from '../../mongoose'
import PersonSchema, { events as documentEvents } from './schema'
import * as balanceOperations from './balancesOps'
import type { PersonDoc as PersonDocument, Events } from './schema'

// Re-exporta a interface do documento da person
export type PersonDoc = PersonDocument

/** Interface do Model da Person, com os métodos estáticos do mesmo */
interface PersonModel extends Model<PersonDoc> {
	balanceOps: typeof balanceOperations
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
