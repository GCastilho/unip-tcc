import { SuportedCurrencies as SC } from '../../currencyApi/currencyApi'
import currencyApi from '../../currencyApi'

/** Interface do objeto experado nos requests de withdraw */
export interface Withdraw {
	currency: SC
	destination: string
	amount: string|number
}

export default function balances(socket: SocketIO.Socket) {
	console.log('balances endpoint')
	console.log(`the user is ${socket.user ? '' : 'NOT '}authenticated`)
	if (!socket.user) return

	/**
	 * Executa um request de saque de uma moeda; Retorna o opid da transação
	 * através de um callback no caso de sucesso
	 */
	socket.on('withdraw', async (request: Withdraw, callback: (err: any, res?: string) => void) => {
		if (!socket.user) return callback('NotLoggedIn')
		try {
			const { currency, destination, amount } = request
			const opid = await currencyApi.withdraw(socket.user, currency, destination, +amount)
			callback(null, opid.toHexString())
		} catch(err) {
			if (err === 'NotEnoughFunds') {
				callback('NotEnoughFunds')
			} else {
				console.error('Error on socket withdraw:', err)
				callback('InternalServerError')
			}
		}
	})
}
