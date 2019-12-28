import User from '../userApi/user'

declare module 'socket.io' {
	interface Socket {
		/**
		 * Reference to the instance of the class User for this particular user,
		 * if this connection comes from an autenticated user
		 */
		user?: User
	}
}
