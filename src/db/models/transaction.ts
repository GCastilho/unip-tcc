import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'bson'
import { Person } from './person/interface'

/**
 * Master Server Transaction Interface
 * 
 * Interface de transações base utilizada pelo servidor principal e pelos
 * módulos externos
 */
interface MST {
	/** Identificador único dessa transação */
	txid: string,
	/** Account que recebeu a transação */
	account: string,
	/** Amount da transação */
	amount: number,
	/** Tipo dessa transação */
	type: 'receive' | 'send',
	/**
	 * Timestamp da transação, o servidor principal usa Date, os módulos
	 * externos transmitem o timestamp como um number
	 */
	timestamp: number | Date
}

/**
 * External Module Transaction Interface
 * 
 * Interface Transaction para COMUNICAÇÃO entre os módulos externos e o
 * servidor principal
 */
export interface EMT extends MST {
	/**
	 * Identificador da operação na collection de transactions do
	 * servidor principal, enviado na forma de string ao passar pelo socket
	 */
	opid?: string,
	/**
	 * Status da transação
	 * 
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 * 
	 * confirmed: A transação foi confirmada pela rede e é considerada
	 * irreversível
	 */
	status: 'pending' | 'confirmed',
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: TransactionDoc['confirmations'],
	/** Timestamp em transmissões para e com os módulos externos é em number */
	timestamp: number
}

/**
 * Interface Transaction do que o servidor principal usa para se comunicar
 * entre seus módulos internos
 */
export interface Transaction extends MST {
	/** Timestamp da transação */
	timestamp: Date
}

/**
 * Interface para o evento de update_transaction
 */
export interface TxUpdt {
	/**
	 * Identificador da operação na collection de transactions do
	 * servidor principal
	 */
	opid: string,
	/**
	 * Status da transação
	 * 
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 * 
	 * confirmed: A transação foi confirmada pela rede e é considerada
	 * irreversível
	 */
	status: EMT['status'],
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: EMT['confirmations']
}

/** A interface dessa collection */
interface TransactionDoc extends Transaction, Document {
	_id: ObjectId,
	/** Referência ao usuário dono dessa transação */
	user: Person['_id'],
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
	status: EMT['status'] | 'processing',
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: number
}

/** Schema da collection de transações dos usuários */
const TransactionSchema: Schema = new Schema({
	user: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	txid: {
		type: String,
		unique: true
	},
	type: {
		type: String,
		enum: ['receive', 'send'],
		required: true
	},
	status: {
		type: String,
		enum: [ 'processing', 'pending', 'confirmed' ],
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
		required: true
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Model da collection Transactions, responsável por armazenar as transações
 * dos usuários
 */
export default mongoose.model<TransactionDoc>('Transaction', TransactionSchema)
