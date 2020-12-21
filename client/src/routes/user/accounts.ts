import { apiRequest } from '../../utils/middlewares'
import type { SuportedCurrencies } from '../../../../src/libs/currencies'

/** O type do objeto retornado pelo GET dessa rota */
export type Accounts = {
	[key in SuportedCurrencies]: string[]
}

export const get = apiRequest('get', '/v1/user/accounts')
