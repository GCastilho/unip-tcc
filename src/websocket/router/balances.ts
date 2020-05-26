import * as CurrencyApi from '../../currencyApi'

/** Interface do retorno do socket ao receber 'list' */
export interface List {
	name: CurrencyApi.SuportedCurrencies
	code: ReturnType<typeof CurrencyApi['detailsOf']>['code']
	fee: ReturnType<typeof CurrencyApi['detailsOf']>['fee']
	decimals: ReturnType<typeof CurrencyApi['detailsOf']>['decimals']
	accounts: string[]|undefined
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
	socket.on('list', async function(callback: (err: any, list?: List[]) => void) {
		if (!socket.user) return callback('NotLoggedIn')

		console.log('requested list')
		const list: List[] = []
		for (const currency of CurrencyApi.currencies) {
			const details = CurrencyApi.detailsOf(currency)
			list.push({
				name:     currency,
				code:     details.code,
				fee:      details.fee,
				decimals: details.decimals,
				accounts: await socket.user?.getAccounts(currency)
			})
		}

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
			const opid = await CurrencyApi.withdraw(socket.user, currency, destination, +amount)
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
