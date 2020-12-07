import { apiRequest } from '../../utils/middlewares'

/** O type do objeto retornado pelo GET dessa rota */
export type { MarketDepth } from '../../../../interfaces/market'

export const get = apiRequest('get', '/v1/market/orderbook/depth')
