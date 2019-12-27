import mongoose from 'mongoose'
import { Person } from './interface'
import { PersonSchema } from './schema'

/**
 * Model da collection people, responsável por armazenar as informações dos
 * usuários
 */
export = mongoose.model<Person>('Person', PersonSchema)
