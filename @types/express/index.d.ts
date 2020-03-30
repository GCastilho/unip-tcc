import type User from '../../src/userApi/user'

declare module 'express-serve-static-core' {
	interface Request {
		/** Instância da User caso o request seja de um usuário autenticado */
		user?: User
	}
}
