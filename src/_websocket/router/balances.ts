import currencyApi from '../../currencyApi'

export default function b(socket: SocketIO.Socket) {
	console.log('balances endpoint')
	console.log(`the user is ${socket.user ? '' : 'NOT '}authenticated`)
	if (!socket.user) return

	/**
	 * Retorna um array com a lista das currencies, as accounts e o saldo de
	 * cada currency
	 * 
	 * @todo Retornar usando uma interface para poder padronizar o que será
	 * retornado
	 */
	socket.on('list', (callback: (list: any[]) => void) => {
		console.log('requested balance list')
		const list = currencyApi.currenciesDetailed.map(currency => {
			const { code, name, decimals } = currency
			const accounts = socket.user?.getAccounts(name)
			const balance = socket.user?.getBalance(name).toFullString()
			return { code, name, decimals, accounts, balance}
		})
		callback(list)
	})
}
