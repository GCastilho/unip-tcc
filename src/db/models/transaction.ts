import { ObjectId } from 'mongodb'
import mongoose, { Schema, Document } from '../mongoose'
import { currencies, truncateAmount } from '../../libs/currencies'
import type { PersonDoc } from './person'
import type { TxInfo } from '../../../interfaces/transaction'
import type { SuportedCurrencies } from '../../libs/currencies'

/** A interface dessa collection */
export interface TransactionDoc extends Document {
	/** Referência ao usuário dono dessa transação */
	userId: PersonDoc['_id']
	/**
	 * Status da transação
	 *
	 * ready: O processamento inicial foi concluído e a tranação está pronta para
	 * ser enviada ao módulo externo
	 *
	 * external: A transação foi enviada ao módulo externo
	 *
	 * pending: A transação já foi processada e aceita no saldo do usuário e
	 * está pendente para ser confirmada na rede
	 *
	 * confirmed: A transação foi confirmada na rede e teve o saldo do usuário
	 * atualizado no database
	 *
	 * cancelled: A transação está no módulo externo, que não está acessível, e
	 * foi requisitado seu cancelamento. O cancelamento não pode ocorrer até
	 * a resposta do módulo externo
	 */
	status: 'ready'|'external'|'pending'|'confirmed'|'cancelled'
	/** De qual currency essa transação se refere */
	currency: SuportedCurrencies
	/** Identificador da transação na rede da moeda */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação */
	amount: number
	/** Taxa cobrada para a execução da operação */
	fee?: number
	/** Tipo dessa transação */
	type: 'receive'|'send'
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: Date
	toJSON(): TxInfo
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
		required: function(this: TransactionDoc) {
			// Faz txid ser required caso a tx já esteja na rede (pending/confirmed)
			return this.status == 'pending' || this.status == 'confirmed'
		},
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
		enum: ['ready', 'external', 'pending', 'confirmed', 'cancelled'],
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
		type: Number,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
		}
	},
	fee: {
		type: Number,
		min: 0,
	},
	timestamp: {
		type: Date,
		required: true
	}
}, {
	toJSON: {
		transform: function(doc: TransactionDoc): TxInfo {
			let status: TxInfo['status']
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
				amount:        doc.amount,
				fee:           doc.fee,
				type:          doc.type,
				confirmations: doc.confirmations,
				timestamp:     doc.timestamp.getTime()
			}
		}
	}
})

/**
 * Faz transações de recebimento terem txid unique e permite que transações
 * para mais de uma account do sistema (um batch) sejam reconhecidas como
 * transações diferentes
 */
TransactionSchema.index({
	txid: 1,
	type: 1,
	account: 1,
}, {
	unique: true,
	partialFilterExpression: {
		txid: { $exists: true },
		type: 'receive',
	}
})

/**
 * Cria um index para transações de saque que permita várias transações com o
 * mesmo txid (necessário para fazer batch)
 */
TransactionSchema.index({
	txid: 1,
	type: 1,
}, {
	partialFilterExpression: {
		txid: { $exists: true },
		type: 'send',
	}
})

TransactionSchema.pre('validate', function(this: TransactionDoc) {
	// Faz a truncagem do amount de acordo com os decimais da currency
	if (typeof this.amount == 'number') {
		this.amount = truncateAmount(this.amount, this.currency)
	}
})

/**
 * Model da collection Transactions, responsável por armazenar as transações
 * dos usuários
 */
const Transaction = mongoose.model<TransactionDoc>('Transaction', TransactionSchema)

export default Transaction
