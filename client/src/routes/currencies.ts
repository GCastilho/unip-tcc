import axios from 'axios'
import assert from 'assert'
import { mainServerIp } from '../utils/middlewares'
import type { Request, Response } from 'express'
import type { SuportedCurrencies } from '../../../src/libs/currencies'

/** O type do objeto retornado pelo GET dessa rota */
export type Currencies = {
	[key in SuportedCurrencies]: {
		code: string
		decimals: number
		fee: number
	}
}

const currencies = {} as Currencies

/**
 * Requisita informações das currencies da API, computa-as no formato do type
 * Currencies e armazena no objeto de currencies
 *
 * Esse objeto é um cache em memória das informações das currencies no melhor
 * formato para ser utilizado pelo svelte (um objeto em que as keys são os
 * nomes das currencies)
 *
 * Essa promessa será resolvida APENAS quando houver garantia que o objeto
 * está devidamente populado
 */
const initialFetch = (async function fetchFromApi(): Promise<void> {
	try {
		const { data } = await axios.get('/v1/currencies', { baseURL: mainServerIp })

		assert(data instanceof Array, 'API did not respond a currencies request with an array')
		// Popula o objeto currencies usando o array retornado da API
		for (const currency of data) {
			assert(typeof currency.name == 'string')
			assert(typeof currency.code == 'string')
			assert(typeof currency.decimals == 'number')
			assert(typeof currency.fee == 'number')
			currencies[currency.name] = {
				code: currency.code,
				decimals: currency.decimals,
				fee: currency.fee,
			}
		}
		console.log('Sapper\'s currencies cache has been populated')
	} catch (err) {
		// Timeout de 10s
		await (() => new Promise(resolve => setTimeout(resolve, 10000)))()
		return fetchFromApi()
	}
})()

/** Retorna o objeto de currencies uma vez que o cache tiver sido populado */
export async function get(_req: Request, res: Response) {
	await initialFetch
	res.status(200).send(currencies)
}
