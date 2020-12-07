import { apiRequest } from '../../../utils/middlewares'

/** O type do objeto de dentro do array retornado pelo GET dessa rota */
export type { MarketOrder } from '../../../../../interfaces/market'

export const get = apiRequest('get', '/v1/market/orderbook')

export const post = apiRequest('post', '/v1/market/orderbook')
