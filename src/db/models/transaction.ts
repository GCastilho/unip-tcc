import { ObjectId, Decimal128 } from 'mongodb'
import mongoose, { Schema, Document } from '../mongoose'
import { currencies, currenciesObj } from '../../libs/currencies'
import type { PersonDoc } from './person'
import type { SuportedCurrencies } from '../../libs/currencies'

/** A interface dessa collection */
export interface TransactionDoc extends Document {
	/** Referência ao usuário dono dessa transação */
	userId: PersonDoc['_id']
	/**
	 * Status da transação
	 *
	 * pending: A transação já foi processada e aceita no saldo do usuário e
	 * está pendente para ser confirmada na rede
	 *
	 * ready: O processamento inicial foi concluído e a tranação está pronta para
	 * ser enviada ao módulo externo
	 *
	 * picked: A transação foi selecionada pelo método de withdraw para ser
	 * enviada ao módulo externo
	 *
	 * external: A transação foi envada ao módulo externo
	 *
	 * confirmed: A transação foi confirmada na rede e teve o saldo do usuário
	 * atualizado no database
	 *
	 * processing: A transação ainda não foi processada no saldo do usuário,
	 * podendo ser negada quando isso ocorrer (e deletada do db)
	 */
	status: 'processing'|'ready'|'picked'|'external'|'cancelled'|'pending'|'confirmed'
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
	toJSON(): TxJSON
}

/** Interface do objeto retornado pelo método toJSON */
export interface TxJSON extends Omit<
	TransactionDoc,
	keyof Document|'userId'|'status'|'amount'|'fee'|'timestamp'
> {
	opid: string
	status: 'processing'|'pending'|'confirmed'
	amount: number
	fee?: number
	timestamp: number
}

/** Schema da collection de transações dos usuários */
const TransactionSchema = new Schema({
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
		enum: currencies.map(currency => currency.name),
		required: true
	},
	status: {
		type: String,
		enum: ['processing', 'ready', 'picked', 'external', 'cancelled', 'pending', 'confirmed'],
		required: true
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false
	},
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
}, {
	toJSON: {
		transform: function(doc: TransactionDoc): TxJSON {
			let status: TxJSON['status']
			switch (doc.status) {
				case('pending'):
				case('confirmed'):
					status = doc.status
					break
				default:
					status = 'processing'
			}

			return {
				opid:          doc.id,
				status:        status,
				currency:      doc.currency,
				txid:          doc.txid,
				account:       doc.account,
				amount:       +doc.amount.toFullString(),
				fee:           doc.fee,
				type:          doc.type,
				confirmations: doc.confirmations,
				timestamp:     doc.timestamp.getTime()
			}
		}
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

TransactionSchema.pre('validate', function(this: TransactionDoc) {
	if (this.amount instanceof Decimal128)
		this.amount = this.amount.truncate(currenciesObj[this.currency].decimals)
})

/**
 * Model da collection Transactions, responsável por armazenar as transações
 * dos usuários
 */
const Transaction = mongoose.model<TransactionDoc>('Transaction', TransactionSchema)

export default Transaction
