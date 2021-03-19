import { apiRequest } from '../../../utils/middlewares'

export const del = apiRequest('delete', '/v1/user/transactions/:opid')
