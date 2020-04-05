import { Schema } from 'mongoose'
import { Decimal128, ObjectId } from 'mongodb'

/** A interface de operações de alteração de saldo pendentes*/
export interface Pending {
	/**
	 * Referencia ao objectId da operação em sua respectiva collection
	 */
	opid: ObjectId
	/**
	 * O tipo da operação, para identificar em qual collection ela está
	 */
	type: 'transaction'|'trade'
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: Decimal128
}

/**
 * Schema das operações (que involvem alteração de saldo) pendentes desse
 * usuário, uma vez concluídas elas devem ser removidas da collection
 */
export const PendingSchema: Schema = new Schema({
	opid: {
		type: Schema.Types.ObjectId,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	amount: {
		type: Decimal128,
		required: true
	}
})
