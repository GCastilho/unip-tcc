import mongoose, { Schema, Document } from 'mongoose'

export interface Meta extends Document {
	info: string
	details: string
}

const Meta: Schema = new Schema({
	info: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	details: {
		type: String,
		trim: true,
		required: true
	}
})

export default mongoose.model<Meta>('meta', Meta)
