import { ObjectId } from 'mongodb'
import { startSession } from 'mongoose'
import Market, { events } from './market'
import Order from '../db/models/order'
import Price from '../db/models/price'
import Person from '../db/models/person'
import { currencyNames } from '../libs/currencies'
import type { OrderDoc } from '../db/models/order'
import type { PersonDoc } from '../db/models/person'
import type { SuportedCurrencies as SC } from '../libs/currencies'
import type { OrderRequest, MarketDepth, PriceRequest } from '../../interfaces/market'

/** Re-exporta o eventEmitter do módulo da Market */
export { events } from './market'

/** Ouve por eventos de atualização de preço e manda-os para o banco de dados */
events.on('price_update', async priceUpdt => {
	// Workaround para não logar esses preços na collection e não crashar a candle
	if (priceUpdt.price == 0 || priceUpdt.price == Infinity) return

	try {
		await Price.createOne(priceUpdt)
	} catch (err) {
		console.error('Error while inserting priceUpdate', err)
	}
})

/** Classe do objeto do erro de mercado não encontrado */
class MarketNotFound extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'MarketNotFound'
	}
}

/** Map que armazena todos os mercados de pares de currencies instanciados */
const markets = new Map<string, Market>()

/** Retorna a string chave de mercado de um par */
function getMarketKey(orderedPair: OrderDoc['orderedPair']) {
	return orderedPair.map(item => item.currency).toString()
}

/**
 * Faz o boostrap de TODAS as markets
 * @todo Isso User a getMarketKey ou a getMarketKey permitir usar só os nomes
 */
for (let i = 0; i < currencyNames.length; i++) {
	for (let j = 0; j < currencyNames.length; j++) {
		if (i == j) continue
		const pair = [currencyNames[i], currencyNames[j]].sort() as [SC, SC]
		const market = new Market(pair)
		markets.set(pair.toString(), market)
	}
}
markets.forEach(market => {
	market.bootstrap().catch(err => {
		console.error('Error bootstrapping market for', market.currencies, err)
	})
})

/**
 * Adiciona uma nova ordem ao livro de ordens do mercado
 * @param order A nova odem que deve ser adicionada ao livro de ordens
 * @throws ValidationError from mongoose
 * @returns Order's opid
 */
export async function add(userId: PersonDoc['_id'], order: OrderRequest): Promise<ObjectId> {
	const orderDoc = await new Order({
		userId: userId,
		status: 'preparing',
		...order,
		timestamp: new Date()
	}).save()

	console.log('new order received', orderDoc.toObject({ virtuals: true }))

	try {
		await Person.balanceOps.add(userId, order.owning.currency, {
			opid: orderDoc._id,
			type: 'trade',
			amount: - Math.abs(order.owning.amount)
		})
	} catch (err) {
		if (err === 'NotEnoughFunds')
			await orderDoc.remove()
		throw err
	}

	orderDoc.status = 'ready'
	await orderDoc.save()

	// Retorna ou cria uma nova instancia da Market para esse par
	let market = markets.get(getMarketKey(orderDoc.orderedPair))

	if (market) {
		await market.add(orderDoc)
	} else {
		market = new Market(orderDoc.orderedPair.map(v => v.currency) as [SC, SC])

		/**
		 * A chave desse par no mercado é a string do array das currencies em ordem
		 * alfabética, pois isso torna a chave simples e determinística; Deve ser
		 * setado antes de uma operação assíncrona para evitar concorrência
		 */
		markets.set(getMarketKey(orderDoc.orderedPair), market)

		/** Faz o bootstrap da market, a ordem atual será adicionado aqui */
		await market.bootstrap()
	}

	return orderDoc._id
}

/**
 * Remove uma ordem do mercado de ordens e do banco de dados caso ela ainda
 * não tenha sido executada
 * @param opid O id da ordem que será removida
 * @throws 'OrderNotFound' Se a ordem não existir ou já tiver sido executada
 * @throws OperationNotFound if Person could not found the locked operation
 * @throws MarketNotFound if the market was not found in the markets map
 */
export async function remove(userId: PersonDoc['_id'], opid: ObjectId) {
	const session = await startSession()
	session.startTransaction()

	try {
		const order = await Order.findOne({ _id: opid, status: 'ready' }).session(session)
		if (!order) throw 'OrderNotFound'

		const market = markets.get(getMarketKey(order.orderedPair))
		if (!market) throw new MarketNotFound(`Market not found while removing: ${order}`)
		await market.remove(order)

		await order.remove()
		await Person.balanceOps.cancel(userId, order.owning.currency, opid, session)

		await session.commitTransaction()
	} catch (err) {
		await session.abortTransaction()
		throw err
	} finally {
		await session.endSession()
	}
}

/** Retorna o market depth de um par */
export async function getMarketDepth(base?: string, target?: string): Promise<MarketDepth[]> {
	console.log('getMarketDepth', base, target)

	// TODO: Isso deveria usar o getMarkeyKey, alterá-la para permitir isso
	const market = markets.get(`${base},${target}`)
	if (!market) throw new MarketNotFound(`Market not found while getting depth for ${base} and ${target}`)

	return market.depth
}

/** Retorna o market price de um par */
export async function getMarketPrice(base?: string, target?: string): Promise<PriceRequest> {
	console.log('getMarketPrice', base, target)

	// TODO: Isso deveria usar o getMarkeyKey, alterá-la para permitir isso
	const market = markets.get(`${base},${target}`)
	if (!market) throw new MarketNotFound(`Market not found while getting depth for ${base} and ${target}`)

	return market.prices
}
