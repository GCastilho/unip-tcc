import userApi from '../userApi'
import User from '../userApi/user'
import currencyApi from '../currencyApi'
import * as connectedUsers from './connectedUsers'
import { GlobalListeners } from './router'
import { CurrencyApi } from '../currencyApi/currencyApi'

GlobalListeners.add('disconnect', function(this: SocketIO.Socket, reason) {
	console.log('Socket disconnected:', reason)
	connectedUsers.remove(this.user?.id)
})

/**
 * Autentica a conexão de um socket conectado, inserindo referência à Users no
 * socket e atualizando a connectedUsers
 * @param sessionID O token de autenticação desse usuário
 * @param callback O callback de retorno ao cliente
 */
GlobalListeners.add('authenticate', async function(this: SocketIO.Socket,
	sessionID: string,
	callback: (err: null|string, response?: string) => void
) {
	if (typeof sessionID === 'string') {
		try {
			const user = await userApi.findUser.byCookie(sessionID)
			this.user = user
			connectedUsers.add(this)
			callback(null, 'authenticated')
		} catch(err) {
			this.user = undefined
			if (err === 'CookieNotFound' || err === 'UserNotFound') {
				callback('TokenNotFound')
			} else {
				console.error('Error while authenticating user:', err)
				callback('InternalServerError')
			}
		}
	} else {
		connectedUsers.remove(this.user?.id)
		this.user = undefined
		callback('TokenNotProvided')
	}
})

/**
 * Desautentica uma conexão de um socket conectado, removendo a referência à
 * Users no socket e atualizando a connectedUsers
 * @param callback O callback de retorno ao cliente
 */
GlobalListeners.add('deauthenticate', function(this: SocketIO.Socket,
	callback: (err: null, response?: string) => void
) {
	connectedUsers.remove(this.user?.id)
	this.user = undefined
	callback(null, 'deauthenticated')
})

/** Interface do retorno do socket ao receber 'list' */
export interface List {
	code: CurrencyApi['currenciesDetailed'][number]['code']
	name: CurrencyApi['currenciesDetailed'][number]['name']
	decimals: CurrencyApi['currenciesDetailed'][number]['decimals']
	accounts: ReturnType<User['getAccounts']>|undefined
	balance: string|undefined
}

/**
 * Retorna um array com a lista das currencies, as accounts e o saldo de
 * cada currency
 */
GlobalListeners.add('list', function(this: SocketIO.Socket,
	callback: (err: any, list: List[]) => void
) {
	console.log('requested balance list')
	const list = currencyApi.currenciesDetailed.map(currency => ({
		code:     currency.code,
		name:     currency.name,
		decimals: currency.decimals,
		accounts: this.user?.getAccounts(currency.name),
		balance:  this.user?.getBalance(currency.name).toFullString()
	}))
	callback(null, list)
})
