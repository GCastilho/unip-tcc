import userApi from '../userApi'
import currencyApi from '../currencyApi'
import * as connectedUsers from './connectedUsers'
import { GlobalListeners } from './router'
import { SuportedCurrencies as SC } from '../currencyApi/currencyApi'
import { Person } from '../db/models/person/interface'

/** O Objeto 'balance' do usuário com os saldos em string */
type StringifiedBalanceObject = {
	[key in keyof Person['currencies'][SC]['balance']]: number
};

/** Interface do retorno do socket ao receber 'fetch_balances' */
export type FetchBalances = {
	[key in SC]: StringifiedBalanceObject
};

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

/**
 * Retorna um objeto em que as chaves são os nomes das currencies e os valores
 * são os saldos do usuários para as respectivas currencies
 */
GlobalListeners.add('fetch_balances', function(this: SocketIO.Socket,
	callback: (err: any, balances?: FetchBalances) => void
) {
	if (!this.user) return callback('NotLoggedIn')
	console.log('requested balance fetch')

	const balances = {} as FetchBalances
	for (let currency of currencyApi.currencies) {
		const balanceObj = Object.entries(this.user.getBalance(currency))
			.reduce((acc, [key, value]) => ({
				...acc, [key]: +value.toFullString()
			}), {} as StringifiedBalanceObject)

		balances[currency] = balanceObj
	}

	callback(null, balances)
})