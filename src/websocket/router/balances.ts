import { SuportedCurrencies as SC, CurrencyApi } from '../../currencyApi/currencyApi'
import currencyApi from '../../currencyApi'
import User from '../../userApi/user'

/** Interface do objeto experado nos requests de withdraw */
export interface Withdraw {
	currency: SC
	destination: string
	amount: string|number
}

/** Interface do retorno do socket ao receber 'list' */
export interface List {
	code: CurrencyApi['currenciesDetailed'][any]['code']
	name: CurrencyApi['currenciesDetailed'][any]['name']
	decimals: CurrencyApi['currenciesDetailed'][any]['decimals']
	accounts: ReturnType<User['getAccounts']>|undefined
	balance: string|undefined
}

export default function balance(socket: SocketIO.Socket) {
	console.log('balances endpoint')
	console.log(`the user is ${socket.user ? '' : 'NOT '}authenticated`)
	if (!socket.user) return

	/**
	 * Retorna um array com a lista das currencies, as accounts e o saldo de
	 * cada currency
	 */
	socket.on('list', (callback: (list: List[]) => void) => {
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
