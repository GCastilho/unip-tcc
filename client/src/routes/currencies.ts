import currencies from '../utils/currencies'
import type { Request, Response } from 'express'

/** O type do objeto retornado pelo GET dessa rota */
export type { Currencies } from '../utils/currencies'

/** Retorna o objeto de currencies do módulo de currencies do servidor */
export async function get(_req: Request, res: Response) {
	res.status(200).send(currencies)
}
