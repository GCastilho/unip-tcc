import type { Socket } from 'socket.io'
import type { PersonDoc } from '../../db/models/person'

/**
 * Map de usuários conectados no sistema, a chave é a string do userId do
 * usuário e o valor é um set de todos os socket desse usuário que estão
 * conectados
 */
const connectedUsers = new Map<PersonDoc['id'], Set<Socket>>()

/**
 * Adiciona o socket de um usuário autenticado ao map de usuários conectados
 * @param socket O socket da conexão com o usuário
 */
export function add(socket: Socket): void {
	if (!socket.userId) {
		throw new Error('Socket must be from an authenticated user')
	}

	const set = connectedUsers.get(socket.userId)
	if (set) set.add(socket)
	else connectedUsers.set(socket.userId, new Set([socket]))
}

/**
 * Retorna o set de sockets de um usuário conectado
 * @param userId O userId do usuário
 *
 * @returns Set<Socket> - caso o usuário esteja conectado
 * @returns undefined - caso o usuário NÃO esteja conectado
 */
export function get(userId: PersonDoc['id']): Set<Socket>|undefined {
	return connectedUsers.get(userId)
}

/**
 * Remove um socket de usuário do Set de sockets de usuários autenticados.
 * Se o Set resultante estiver vazio, o usuário será removido do map de usuários
 * autenticados
 *
 * @param socket O socket (de um usuário autenticado) que será removido da lista
 * de sockets de usuários autenticados
 */
export function remove(socket: Socket): void {
	if (!socket.userId) return // Socket de usuário não autenticado

	const set = connectedUsers.get(socket.userId)
	if (!set) throw new Error('No user connected found for the given userId')

	set.delete(socket)
	if (set.size == 0) connectedUsers.delete(socket.userId)
}
