import mongoose, { Model } from '../../mongoose'
import PersonSchema from './schema'
import * as balanceOperations from './balancesOps'
import type { PersonDoc as PersonDocument } from './schema'

// Re-exporta a interface do documento da person
export type PersonDoc = PersonDocument

/** Interface do Model da Person, com os métodos estáticos do mesmo */
interface PersonModel extends Model<PersonDoc> {
	balanceOps: typeof balanceOperations
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

export default Person
