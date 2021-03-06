import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema } from '../mongoose'
import { currencies } from '../../libs/currencies'
import type { Model, DocumentQuery } from 'mongoose'
import type { SuportedCurrencies as SC } from '../../libs/currencies'
import type { MarketTrade as UserTrade } from '../../../interfaces/market'

export interface TradeDoc extends Document {
	/**
	 * Status da operação
	 *
	 * processing: A order está sendo processada pela Market
	 * closed: O processamento da ordem foi concluído
	 */
	status: 'processing'|'closed'
	/** Informações da ordem maker */
	maker: {
		/** ID do usuário que adicionou a ordem maker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId?: ObjectId
		/** A currency que o usuário recebeu na transação */
		currency: SC
		/** A quantidade que o usuário recebeu na transação */
		amount: number
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/** Informações da ordem taker */
	taker: {
		/** ID do usuário que adicionou a ordem taker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId?: ObjectId
		/** A currency que o usuário recebeu na transação */
		currency: SC
		/** A quantidade que o usuário recebeu na transação */
		amount: number
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/** O timestamp dessa operação */
	timestamp: Date
	/** O preço dessa trade no orderbook */
	readonly price: number
	/** Um array com maker e taker em ordem alfabética de acordo com a currency */
	readonly orderedPair: [TradeDoc['maker'], TradeDoc['taker']]|[TradeDoc['taker'], TradeDoc['maker']]
}

const TradeSchema = new Schema({
	status: {
		type: String,
		enum: ['processing', 'closed'],
		required: true
	},
	maker: {
		userId: {
			type: ObjectId,
			required: true,
			ref: 'Person'
		},
		orderId: {
			type: ObjectId,
			required: false,
			ref: 'Order'
		},
		currency: {
			type: String,
			enum: currencies.map(currency => currency.name),
			required: true,
			validate: {
				// Garante que a currency da maker é diferente da currency da taker
				validator: function(this: TradeDoc, currency: TradeDoc['maker']['currency']) {
					return this.taker.currency != currency
				},
				message: () => 'Currency MAKER must be different than currency TAKER'
			}
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
		},
		fee: {
			type: Number,
			required: true,
			min: 0
		}
	},
	taker: {
		userId: {
			type: ObjectId,
			required: true,
			ref: 'Person'
		},
		orderId: {
			type: ObjectId,
			required: false,
			ref: 'Order'
		},
		currency: {
			type: String,
			enum: currencies.map(currency => currency.name),
			required: true
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
		},
		fee: {
			type: Number,
			required: true,
			min: 0
		}
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Retorna um array com maker e taker ordenados pelo nome das currencies
 */
TradeSchema.virtual('orderedPair').get(function(this: TradeDoc): TradeDoc['orderedPair'] {
	return [this.maker, this.taker].sort((a, b) => {
		return a.currency > b.currency ? 1 : a.currency < b.currency ? -1 : 0
	}) as TradeDoc['orderedPair']
})

TradeSchema.virtual('price').get(function(this: TradeDoc): TradeDoc['price'] {
	const [base, target] = this.orderedPair
	return base.amount / target.amount
})

const customQueries = {
	byUser(this: DocumentQuery<TradeDoc[]|null, TradeDoc>,
		userId: ObjectId
	): DocumentQuery<UserTrade[]|null, TradeDoc> {
		this.or([
			{ 'maker.userId': userId },
			{ 'taker.userId': userId }
		])

		const transform = (doc: TradeDoc): UserTrade => ({
			opid: doc.id,
			currencies: doc.orderedPair.map(v => v.currency) as UserTrade['currencies'],
			price: doc.price,
			amount: doc.orderedPair[1].amount,
			fee: doc.maker.userId.toHexString() == userId.toHexString()
				? doc.maker.fee
				: doc.taker.fee,
			total: doc.orderedPair[0].amount,
			timestamp: doc.timestamp.getTime()
		})

		return this.map(docs => docs == null
			? null
			: docs.map(doc => transform(doc))
		)
	}
}

TradeSchema.query = customQueries

/**
 * Model do documento de uma trade
 */
const Trade = mongoose.model<TradeDoc, Model<TradeDoc, typeof customQueries>>('Trade', TradeSchema)

export default Trade
