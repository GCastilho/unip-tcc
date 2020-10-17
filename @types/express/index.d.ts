import type { ObjectId } from 'mongodb'

declare module 'express-serve-static-core' {
	interface Request {
		/** UserId do request de um usuário autenticado */
		userId: ObjectId
	}
}
