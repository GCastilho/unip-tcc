import User from '../../userApi/user'

/**
 * Map de usuários conectados no sistema, a chave é o userId do usuário e o
 * valor é o socket da conexão com esse usuário
 */
const connectedUsers = new Map()

/**
 * Adiciona o socket de um usuário autenticado ao map de usuários conectados
 * @param socket O socket da conexão com o usuário
 */
export function add(socket: SocketIO.Socket) {
	if (!socket.user) throw new Error('Socket must be from an authenticated user')
	connectedUsers.set(socket.user.id.toHexString(), socket)
}

/**
 * Retorna o socket de um usuário conectado
 * @param id O userId do usuário
 *
 * @returns SocketIO.Socket - caso o usuário esteja conectado
 * @returns undefined - caso o usuário NÃO esteja conectado
 */
export function get(id: User['id']): SocketIO.Socket|undefined {
	return connectedUsers.get(id.toHexString())
}

/**
 * Remove um usuário do Map de usuários conectados
 * @param id O userId do usuário
 */
export function remove(id?: User['id']) {
	return connectedUsers.delete(id)
}
