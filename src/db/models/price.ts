import assert from 'assert'
import { Schema, startSession } from 'mongoose'
import mongoose from '../mongoose'
import { currencyNames } from '../../libs/currencies'
import type { Document, Model } from 'mongoose'
import type { PriceUpdate } from '../../../interfaces/market'
import type { SuportedCurrencies } from '../../libs/currencies'

/** Objeto de uma modificaçao historica de preço */
export interface PriceDoc extends Document {
	/** Preço inicial da entrada */
	open: number,
	/** Preço final da entrada */
	close: number,
	/** Preço maximo no periodo de duraçao da entrada */
	high: number,
	/** Preço minimo no periodo de duraçao da entrada */
	low: number,
	/** a hora inicial do documento */
	startTime: number,
	/** o periodo(ms) ao qual o resumo de preço se refere*/
	duration: number,
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

const PriceSchema = new Schema({
	open: {
		type: Number,
		required: true,
		validate: {
			validator: v => v >= 0,
			message: props => `open needs to be greater than zero, found ${props.value}`
		}
	},
	close:{
		type: Number,
		required: true,
		validate: {
			validator: v => v >= 0,
			message: props => `close needs to be greater than zero, found ${props.value}`
		}
	},
	high: {
		type: Number,
		required: true,
		validate: {
			validator: v => v >= 0,
			message: props => `high needs to be greater than zero, found ${props.value}`
		}
	},
	low: {
		type: Number,
		required: true,
		validate: {
			validator: v => v >= 0,
			message: props => `low needs to be greater than zero, found ${props.value}`
		}
	},
	startTime:{
		type: Number,
		required: true
	},
	duration: {
		type : Number,
		required: false,
		validate: {
			validator: v => v >= 0,
			message: props => `duration needs to be greater than zero, found ${props.value}`
		}
	},
	currencies: {
		type: [String],
		required: true,
		validate: {
			validator: (currencies: SuportedCurrencies[]) => currencies.length == 2
				&& currencies.every(item => currencyNames.includes(item))
				&& currencies[0] != currencies[1],
			message: 'currencies lenght must be two and currency type must be a SuportedCurrencies',
		}
	}
})

PriceSchema.pre('save', function(this: PriceDoc) {
	this.currencies = this.currencies.sort((a, b) => {
		return a > b ? 1 : a < b ? -1 : 0
	})
})

interface PriceModel extends Model<PriceDoc> {
	/**
	 * Faz um sumário dos histórico de preços do banco em documentos comprimidos
	 * @param currencies O array das duas currencies que fazem o par desse preço
	 */
	summarize(currencies: [SuportedCurrencies, SuportedCurrencies]): Promise<void>
	/**
	 * Insere uma nova entrada de atualização de preço. Entradas inseridas dentro
	 * de um mesmo minuto (cheio) serão condensadas em um documento de duração
	 * de um minuto
	 * @param priceUptd O objeto da atualização de preço
	 */
	createOne(priceUptd: PriceUpdate): Promise<void>
}

PriceSchema.static('createOne', async function(this: PriceModel,
	{ price, currencies }: PriceUpdate,
): ReturnType<PriceModel['createOne']> {
	assert(price >= 0, `Price can NOT be a negative number, found: ${price}`)
	assert(currencies?.length == 2, 'Supported currencies array must have length of 2')

	/** Garante que o array está na ordem correta */
	currencies.sort()

	await this.updateOne({
		currencies,
		startTime: Date.now() - (Date.now() % 60000), // Início do minuto atual
		duration: 60000
	}, {
		$setOnInsert: {
			currencies,
			open: price,
			startTime: Date.now() - (Date.now() % 60000),
			duration: 60000,
		},
		$set: { close: price },
		$max: { high: price },
		$min: { low: price },
	}, {
		upsert: true
	})
})

PriceSchema.static('summarize', async function(this: PriceModel,
	currencies: [SuportedCurrencies, SuportedCurrencies]
): ReturnType<PriceModel['summarize']> {
	/** Garante que o array está na ordem correta */
	currencies.sort()

	const oldest = await Price.findOne({ currencies }).sort({ $natural: 1 })
	if (!oldest) return

	/**
	 * Tempo do documento mais velho arredondado para o início da hora.
	 * Ex: startTime de 01:04 é arredondado para 01:00 (timestamp em ms)
	 */
	const roundedStartTime = oldest.startTime - (oldest.startTime % (60 * 60000))

	/** Array de todos os timestamps que os documentos sumarizados poderão ter */
	const startTimes: number[] = []

	/** Preenche os startTime espaçados de 1h de roundedStartTime até 30d atrás */
	for (
		let startTime = roundedStartTime;
		startTime < Date.now() - 30 * 24 * 60 * 60000; // Docs de até 30 dias atrás
		startTime += 60 * 60000 // Incrementa 1h
	) {
		startTimes.push(startTime)
	}

	/** Operações de sumarização no DB; Todas são disparadas simultaneamente */
	const dbOperations = startTimes.map(async startTime => {
		const session = await startSession()
		await session.withTransaction(async () => {
			const docs = await this.find({
				currencies,
				duration: {
					$lte: 60 * 60000 // dura menos que 1h
				},
				startTime: {
					$gte: startTime,
					$lt: startTime + 60 * 60000 // Docs de até 1h após o startTime
				}
			}).sort({ $natural: 1 })
				.session(session)
			if (docs.length == 0) return

			await new Price({
				currencies,
				open: docs[0].open,
				close: docs[docs.length - 1].close,
				high: Math.max(...docs.map(item => item.high )),
				low: Math.min(...docs.map(item => item.low )),
				startTime,
				duration: 60 * 60000 // 1h,
			}).save({ session })

			await Promise.all(docs.map(doc => doc.remove()))
		}).finally(() => {
			return session.endSession()
		})
	})

	await Promise.all(dbOperations)
})

const Price = mongoose.model<PriceDoc, PriceModel>('Price', PriceSchema, 'pricehistory')

export default Price
