import { apiRequest } from '../../../utils/middlewares'

// ESSA ROTA NÃO EXISTE NA API
export const get = apiRequest('get', '/v1/market/orderbook/:opid')

export const del = apiRequest('delete', '/v1/market/orderbook/:opid')
