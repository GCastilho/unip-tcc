import { apiRequest } from '../../../utils/middlewares'
import type { TxInfo } from '../../../../../interfaces/transaction'

/** O type do objeto de dentro do array retornado pelo GET dessa rota */
export type TxJSON = TxInfo

export const get = apiRequest('get', '/v1/user/transactions')
