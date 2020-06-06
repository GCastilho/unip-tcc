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
	/**
	 * Array dos opids das operações que parcialmente completaram essa pending.
	 * Se o opid de uma operação está nesse array é porque essa operação JÁ
	 * ATUALIZOU o amount dessa pending
	 */
	completions?: ObjectId[]
}

/**
 * Schema das operações (que involvem alteração de saldo) pendentes desse
 * usuário, uma vez concluídas elas devem ser removidas da collection
 */
export const PendingSchema = new Schema({
	opid: {
		type: ObjectId,
		required: true
	},
	type: {
		type: String,
		enum: ['transaction','trade'],
		required: true
	},
	amount: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v != 0,
			message: props => `Amount can not be zero, found ${props.value}`
		}
	},
	completions: {
		type: [ObjectId],
		required: false
	}
})
