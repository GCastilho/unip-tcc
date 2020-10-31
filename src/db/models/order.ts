import assert from 'assert'
import currency from 'currency.js'
import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema } from '../mongoose'
import { currencies, currenciesObj, truncateAmount } from '../../libs/currencies'
import type { SuportedCurrencies as SC } from '../../libs/currencies'

/** Documento de uma ordem */
export interface OrderDoc extends Document {
	/** ID do usuário dono dessa ordem */
	userId: ObjectId
	/**
	 * Status da operação
	 *
	 * preparing: A ordem está na MarketApi, que ainda está processando-a
	 * ready: A ordem está pronta para ser executada
	 */
	status: 'preparing'|'ready'|'cancelled'|'matched'
	/** A currency que usuário está em posse para fazer a operação */
	owning: {
		/** O nome da currency que o usuário tem */
		currency: SC
		/** A quantidade da currency que o usuário quer utilizar */
		amount: number
	}
	/** A currency que o usuário quer ter depois da operação */
	requesting: {
		/** O nome da currency que o usuário quer */
		currency: SC
		/** A quantidade mínima que o usuário quer receber */
		amount: number
	}
	/** ID da ordem original, caso essa tenha sido criada após um split */
	originalOrderId?: OrderDoc['_id']
	/** A data que essa operação foi adicionada */
	timestamp: Date
	/** O tipo dessa operação no orderbook */
	readonly type: 'buy'|'sell'
	/** O preço dessa operação no orderbook */
	readonly price: number
	/** Um array com owning e requesting em ordem alfabética de acordo com a currency */
	orderedPair: [OrderDoc['owning'], OrderDoc['requesting']]|[OrderDoc['requesting'], OrderDoc['owning']]
	/**
	 * Divide uma ordem em duas ordens que somam os valores da original mantendo
	 * o mesmo preço. Os valores passados serão os da ordem retornada. A ordem
	 * original também será modificada com os valores restantes do split
	 * @param owning O valor do amounting que a nova ordem deve ter
	 * @param requesting O valor do requesting que a nova ordem deve ter. Será
	 * calculado automaticamente caso não informado
	 */
	split(owning: number, requesting?: number): OrderDoc
}

const OrderSchema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	status: {
		type: String,
		enum: ['preparing', 'ready', 'cancelled', 'matched'],
		required: true
	},
	owning: {
		currency: {
			type: String,
			enum: currencies.map(currency => currency.name),
			required: true,
			validate: {
				// Garante que owning é diferente de requesting
				validator: function(this: OrderDoc, owning: OrderDoc['owning']['currency']) {
					return this.requesting.currency != owning
				},
				message: () => 'OWNING currency must be different than REQUESTING currency'
			}
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
		}
	},
	requesting: {
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
		}
	},
	originalOrderId: {
		type: ObjectId,
		required: false,
		ref: 'orderbook'
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Retorna um array com owning e requesting ordenados pelo nome das currencies
 */
OrderSchema.virtual('orderedPair').get(function(this: OrderDoc): OrderDoc['orderedPair'] {
	return [this.owning, this.requesting].sort((a, b) => {
		return a.currency > b.currency ? 1 : a.currency < b.currency ? -1 : 0
	}) as OrderDoc['orderedPair']
})

OrderSchema.virtual('type').get(function(this: OrderDoc): OrderDoc['type'] {
	const [base] = this.orderedPair
	return base.currency == this.owning.currency ? 'buy' : 'sell'
})

OrderSchema.virtual('price').get(function(this: OrderDoc): OrderDoc['price'] {
	const [base, target] = this.orderedPair
	return currency(base.amount, {
		precision: currenciesObj[base.currency].decimals
	}).divide(target.amount).value
})

// Faz a truncagem dos valores de acordo com a currency que eles se referem
OrderSchema.pre('validate', function(this: OrderDoc) {
	if (typeof this.owning.amount == 'number') {
		this.owning.amount = truncateAmount(this.owning.amount, this.owning.currency)
	}

	if (typeof this.requesting.amount == 'number') {
		this.requesting.amount = truncateAmount(this.requesting.amount, this.requesting.currency)
	}
})

// Divide uma ordem em duas ordens que somam os valores da original, mantendo o mesmo preço
OrderSchema.method('split', function(this: OrderDoc,
	owning: number,
	requesting?: number
): ReturnType<OrderDoc['split']> {
	if (owning >= this.owning.amount || Number(requesting) >= this.requesting.amount)
		throw new Error('Split amounts can not be greater nor equal than original\'s amount')

	// A conta é feita com alta precisão para evitar erros de arredondamento
	if (!requesting) {
		requesting = currency(this.requesting.amount, {
			precision: 20
		}).multiply(
			currency(owning, {
				precision: 20
			}).divide(this.owning.amount)
		).value
	}

	const priceBefore = this.price

	const copy = new Order(this)
	copy._id = new ObjectId()
	copy.isNew = true
	copy.originalOrderId = this.originalOrderId || this._id

	// Modifica os valores do objeto original
	this.owning.amount = currency(this.owning.amount, {
		precision: currenciesObj[this.owning.currency].decimals
	}).subtract(owning).value
	this.requesting.amount = currency(this.requesting.amount, {
		precision: currenciesObj[this.requesting.currency].decimals
	}).subtract(requesting).value

	// Modifica os valores do objeto cópia
	copy.owning.amount = owning
	copy.requesting.amount = requesting

	// Checar se o preço continua igual
	assert(
		this.price == priceBefore && copy.price == priceBefore,
		`Split can not change the order's price, expected ${priceBefore} to equal ${this.price} and ${copy.price}`
	)

	return copy
})

/**
 * Model do documento de uma ordem
 */
const Order = mongoose.model<OrderDoc>('Order', OrderSchema, 'orderbook')

export default Order
