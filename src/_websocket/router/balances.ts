export default function b(socket: SocketIO.Socket) {
	console.log('balances endpoint')
	console.log(`the user is ${socket.user ? '' : 'NOT '}authenticated`)
}
