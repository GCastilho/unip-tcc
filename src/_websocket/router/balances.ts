import currencyApi from '../../currencyApi'

export default function balance(socket: SocketIO.Socket) {
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
		const list = currencyApi.currenciesDetailed.map(currency => ({
			code:     currency.code,
			name:     currency.name,
			decimals: currency.decimals,
			accounts: socket.user?.getAccounts(currency.name),
			balance:  socket.user?.getBalance(currency.name).toFullString()
		}))
		callback(list)
	})

	/**
	 * Executa um request de saque de uma moeda; Retorna o opid da transação
	 * através de um callback no caso de sucesso
	 * 
	 * @todo request ser uma interface, com tipos definidos e padronizados
	 */
	socket.on('withdraw', async (request, callback: (err: any, res?: string) => void) => {
		if (!socket.user) return callback('NotLoggedIn')
		try {
			const { currency, destination, amount } = request
			const opid = await currencyApi.withdraw(socket.user, currency, destination, amount)
			callback(null, opid.toHexString())
		} catch(err) {
			if (err === 'NotEnoughFunds') {
				callback('NotEnoughFunds')
			} else {
				callback('InternalServerError')
			}
		}
	})
}
