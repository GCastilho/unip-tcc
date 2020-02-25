import mongoose from 'mongoose'

const SessionSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true,
		ref: 'Person'
	},
	sessionID: {
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
export default mongoose.model<any>('Cookie', SessionSchema)
