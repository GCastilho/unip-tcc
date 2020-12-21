import { apiRequest } from '../../utils/middlewares'

export const patch = apiRequest('patch', '/v1/user/password')
