import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'bson'
import { Person } from './person/interface'

/** Interface base de uma transaction */
interface Transaction {
	/** Identificador único dessa transação */
	txid?: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação */
	amount: number
	/** Tipo dessa transação */
	type: 'receive' | 'send',
	/**
	 * Timestamp da transação, o servidor principal usa Date, os módulos
	 * externos transmitem o timestamp como um number
	 */
	timestamp: number | Date
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: number
}

/**
 * Interface base para interfaces de comunicação entre o módulo externo
 * e o main server
 */
interface ExternalModuleTransaction extends Transaction {
	/**
	 * Identificador da operação na collection de transactions do
	 * servidor principal, enviado na forma de string ao passar pelo socket
	 */
	opid?: string
	/**
	 * Status da transação
	 * 
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 * 
	 * confirmed: A transação foi confirmada pela rede e é considerada
	 * irreversível
	 */
	status: 'pending' | 'confirmed'
	/** Timestamp deve ser transmitida em number e em milisegundos */
	timestamp: number
}

/** Interface para transações recebidas */
export interface TxReceived extends ExternalModuleTransaction {
	txid: string
}

/** Interface para ordem de envio de transações */
export interface TxSend extends ExternalModuleTransaction {
	opid: string
	// transações enviadas devem ir com status 'processing', não pending
}

/**
 * Interface para atualização de transações recebidas utilizando
 * o evento update_received_tx
 */
export interface UpdtReceived {
	opid: string
	status: ExternalModuleTransaction['status']
	confirmations: Transaction['confirmations']
}

/**
 * Interface para atualização de transações enviadas utilizando
 * o evento update_sended_tx
 */
export interface UpdtSended {
	opid: TxSend['opid']
	txid: string,
	status: ExternalModuleTransaction['status']
	confirmations?: Transaction['confirmations']
	timestamp: ExternalModuleTransaction['timestamp']
}

/**
 * Interface Transaction do que o servidor principal usa para se comunicar
 * entre seus módulos internos
 */
export interface TransactionInternal extends Transaction {
	timestamp: Date
}

/** A interface dessa collection */
interface TransactionDoc extends TransactionInternal, Document {
	txid: string
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
	status: ExternalModuleTransaction['status'] | 'processing'
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
