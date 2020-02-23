import * as CurrencyApi from '../../currencyApi/currencyApi'
import currencyApi from '../../currencyApi'
import User from '../../userApi/user'

/** Interface do retorno do socket ao receber 'list' */
export interface List {
	code: typeof CurrencyApi['currenciesDetailed'][number]['code']
	name: typeof CurrencyApi['currenciesDetailed'][number]['name']
	decimals: typeof CurrencyApi['currenciesDetailed'][number]['decimals']
	accounts: ReturnType<User['getAccounts']>|undefined
}

/** Interface do objeto experado nos requests de withdraw */
export interface Withdraw {
	currency: CurrencyApi.SuportedCurrencies
	destination: string
	amount: string|number
}

export default function balances(socket: SocketIO.Socket) {
	console.log('balances endpoint')
	console.log(`the user is ${socket.user ? '' : 'NOT '}authenticated`)
	if (!socket.user) return

	/**
	 * Retorna um array com a lista dos códigos, nomes, decimais e accounts de
	 * todas as currencies
	 */
	socket.on('list', function(callback: (err: any, list?: List[]) => void) {
		if (!socket.user) return callback('NotLoggedIn')

		console.log('requested list')
		const list = currencyApi.currenciesDetailed.map(currency => ({
			code:     currency.code,
			name:     currency.name,
			decimals: currency.decimals,
			accounts: socket.user?.getAccounts(currency.name),
		}))
		callback(null, list)
	})

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
