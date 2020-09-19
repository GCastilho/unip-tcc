import { ObjectId, Decimal128 } from 'mongodb'
import mongoose, { Schema, Document } from '../mongoose'
import { detailsOf } from '../../currencyApi'
import type User from '../../userApi/user'
import type { SuportedCurrencies } from '../../currencyApi'

/** A interface dessa collection */
export interface Transaction extends Document {
	_id: ObjectId
	/** Referência ao usuário dono dessa transação */
	userId: User['id']
	/**
	 * Status da transação
	 *
	 * pending: A transação já foi processada e aceita no saldo do usuário e
	 * está pendente para ser confirmada na rede
	 *
	 * confirmed: A transação foi confirmada na rede e teve o saldo do usuário
	 * atualizado no database
	 *
	 * processing: A transação ainda não foi processada no saldo do usuário,
	 * podendo ser negada quando isso ocorrer (e deletada do db)
	 */
	status: 'processing'|'pending'|'confirmed'
	/** De qual currency essa transação se refere */
	currency: SuportedCurrencies
	/** Identificador da transação na rede da moeda */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação */
	amount: Decimal128
	/** Taxa cobrada para a execução da operação */
	fee: number
	/** Tipo dessa transação */
	type: 'receive'|'send'
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: Date
}

/** Schema da collection de transações dos usuários */
const TransactionSchema: Schema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	txid: {
		type: String,
	},
	type: {
		type: String,
		enum: ['receive', 'send'],
		required: true
	},
	currency: {
		type: String,
		enum: ['bitcoin', 'nano'],
		required: true
	},
	status: {
		type: String,
		enum: ['processing', 'pending', 'confirmed'],
		required: true
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false
	},
	/** @todo Adicionar um validador de accounts */
	account: {
		type: String,
		required: true
	},
	amount: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
		}
	},
	fee: {
		type: Number,
		min: 0,
		default: 0
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/*
 * Adicionado txid e type como indice composto caso o txid não seja nulo
 */
TransactionSchema.index({
	txid: 1,
	type: 1
}, {
	unique: true,
	partialFilterExpression: {
		txid: { $exists: true }
	}
})

TransactionSchema.pre('validate', function(this: Transaction) {
	if (this.amount instanceof Decimal128)
		this.amount = this.amount.truncate(detailsOf(this.currency).decimals)
})

/**
 * Model da collection Transactions, responsável por armazenar as transações
 * dos usuários
 */
export default mongoose.model<Transaction>('Transaction', TransactionSchema)
