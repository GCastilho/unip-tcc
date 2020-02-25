import mongoose, { Document, Schema } from 'mongoose'
import type { ObjectId } from 'mongodb'

/**
 * Interface da collection de sessões de autenticação
 */
export interface Session extends Document {
	userId: ObjectId
	sessionId: string
	date: Date
}

const SessionSchema = new Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true,
		ref: 'Person'
	},
	sessionId: {
		type: String,
		required: true,
		unique: true
	},
	date: {
		type: Date,
		required: true
	}
})

/**
 * Model da collection de dados de autenticação
 */
export default mongoose.model<Session>('Session', SessionSchema)
