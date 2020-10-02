import { Person } from '../../src/db/models/person'

declare module 'socket.io' {
	interface Socket {
		/**
		 * Hex string of the _id field of the person's document for this particular
		 * user in the case this connection comes from an autenticated user
		 */
		userId?: Person['id']
	}
}
