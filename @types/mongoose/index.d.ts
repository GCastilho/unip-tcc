import type { ObjectId } from 'mongodb'

declare module 'mongoose' {
	interface Document {
		/**
		 * Virtual getter that by default returns the document's _id field cast
		 * to a string, or in the case of ObjectIds, its hexString. This id
		 * getter may be disabled by passing the option { id: false } at schema
		 * construction time. If disabled, id behaves like any other field on a
		 * document and can be assigned any value.
		 */
		id: string
		/** This documents _id. */
		_id: ObjectId
	}

	interface Model<T extends Document, QueryHelpers = {}> {
		create<T>(doc: CreateQuery<T>, options?: SaveOptions): Promise<T>
		create<T>(doc: CreateQuery<T>, callback?: (err: any, res: T[]) => void): Promise<T>
		create<T>(docs: CreateQuery<T>[], callback?: (err: any, res: T[]) => void): Promise<T[]>
		create<T>(docs: CreateQuery<T>[], options?: SaveOptions, callback?: (err: any, res: T[]) => void): Promise<T[]>
		create<T>(...docs: CreateQuery<T>[]): Promise<T>
	}
}
