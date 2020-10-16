import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import { Document, Schema } from '../../mongoose'
import currenciesSchema from './currencies'
import credentialsSchema from './credentials'
import type { Currencies } from './currencies'
import type { Credentials } from './credentials'

/** Interface para padronizar os eventos da Person */
export interface Events {
	new: (person: PersonDoc) => void
}

type EmitterCallback<E extends keyof Events> = (event: E, ...args: Parameters<Events[E]>[]) => void

class DocumentEvents extends EventEmitter {
	private callbacks: EmitterCallback<keyof Events>[] = []

	/**
	 * Chama a função callback passada com o nome do evento e um array dos
	 * argumentos dele para todos os eventos emitidos nesta classe
	 *
	 * @returns Uma função para remover o callback do listener e não
	 * chamá-lo novamente
	 */
	onAny(callback: EmitterCallback<keyof Events>) {
		this.callbacks.push(callback)
		return () => this.callbacks.filter(v => v != callback)
	}

	emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>) {
		this.callbacks.forEach(callback => callback(event, args))
		return super.emit(event, ...args)
	}
}

/** Eventos emidos por TODAS as instâncias desse model */
export const events = new DocumentEvents()

/**
 * Interface do documento 'person', da collection 'people', que contém
 * informações relacionadas ao usuários
 */
export interface PersonDoc extends Document {
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

PersonSchema.pre('validate', function(this: PersonDoc) {
	// Ao criar o documento, props de sub-schemas serão undefined
	if (!this.isNew) return
	if (typeof this.currencies == 'undefined')
		// @ts-expect-error Mongoose irá automaticamente preencher o subdocumento
		this.currencies = {}
	if (typeof this.credentials == 'undefined')
		// @ts-expect-error Mongoose irá automaticamente preencher o subdocumento
		this.credentials = {}
})

PersonSchema.pre('save', function(this: PersonDoc) {
	// @ts-expect-error Prop não persistente para o post-hook poder ter essa info
	this._wasNew = this.isNew
})

PersonSchema.post('save', function(this: PersonDoc) {
	// @ts-expect-error Prop não persistente para este hook poder ter essa info
	if (!this._wasNew) return
	// @ts-expect-error Removendo a prop do _wasNew para evitar conflito
	delete this._wasNew
	events.emit('new', this)
})

export default PersonSchema
