import { ObjectId } from 'mongodb'
import { startSession } from 'mongoose'
import Transaction from '../../db/models/transaction'
import Person from '../../db/models/person'
import type { TxReceived } from '../../../interfaces/transaction'
import type Currency from './index'

export default function initListeners(this: Currency) {
	/**
	 * Processa novas transações desta currency, atualizando o balanço do
	 * usuário e emitindo um evento de 'new_transaction' no EventEmitter público
	 */
	this._events.on('new_transaction', async (transaction, callback) => {
		console.log('received new transaction', transaction)

		const { txid, account, amount, status, confirmations, timestamp } = transaction

		const session = await startSession()
		try {
			await session.withTransaction(async () => {
				const { _id: userId } = await Person.findOne({
					[`currencies.${this.name}.accounts`]: account
				}, {
					_id: true
				}, {
					session,
				}).orFail()

				/**
				 * ObjectId dessa transação na collection de transactions e
				 * identificador dessa operação para o resto do sistema
				 */
				const opid = new ObjectId()

				const tx = await new Transaction({
					_id: opid,
					userId,
					txid,
					type: 'receive',
					currency: this.name,
					status,
					confirmations,
					account,
					amount,
					timestamp
				}).save({ session })

				await Person.balanceOps.add(userId, this.name, {
					opid,
					type: 'transaction',
					amount
				}, session)

				if (status === 'confirmed')
					await Person.balanceOps.complete(userId, this.name, opid, session)

				this.events.emit('new_transaction', userId, tx.toJSON())
				callback(null, opid.toHexString())
			}).finally(() => session.endSession())
		} catch (err) {
			if (err.code === 11000) {
				// A transação já existe, retornar ela ao módulo externo
				const tx = await Transaction.findOne({ txid })
				if (!tx) throw `Error finding transaction '${txid}' that SHOULD exist`

				const transaction: TxReceived & { opid: string } = {
					opid:          tx.id,
					txid:          tx.txid,
					account:       tx.account,
					amount:        tx.amount,
					status:        tx.status as 'pending'|'confirmed', // Isso tá errado, corrigir!
					confirmations: tx.confirmations,
					timestamp:     tx.timestamp.getTime()
				}
				console.log('Rejecting existing transaction:', transaction)
				callback({ code: 'TransactionExists', transaction })
			} else if (err.name == 'DocumentNotFoundError') {
				// Não encontrou documento do usuário
				callback({
					code: 'UserNotFound',
					message: 'No user found for this account'
				})
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: err.message
				})
			} else {
				console.error('Error processing new_transaction:', err)
				callback({ code: 'InternalServerError' })
				throw err
			}
		}
	})

	/**
	 * Processa requests de atualização de transações PENDENTES existentes
	 * Os únicos campos que serão atualizados são o status e o confirmations
	 */
	this._events.on('update_received_tx', async (updtReceived, callback) => {
		if (!updtReceived.opid) return callback({
			code: 'BadRequest',
			message: '\'opid\' needs to be informed to update a transaction'
		})

		console.log('received update_received_tx', updtReceived)

		const { opid, status, confirmations } = updtReceived

		const session = await startSession()
		try {
			await session.withTransaction(async () => {
				const tx = await Transaction.findOne({
					_id: opid,
					type: 'receive',
					status: 'pending'
				}, {
					userId: 1,
					status: 1,
					confirmations: 1,
				}, { session }).orFail()

				tx.status = status
				tx.confirmations = updtReceived.status === 'confirmed' ? undefined : confirmations
				await tx.save()

				if (status === 'confirmed') {
					await Person.balanceOps.complete(tx.userId, this.name, new ObjectId(opid), session)
				}

				callback(null, `${updtReceived.opid} updated`)
				this.events.emit('update_received_tx', tx.userId, updtReceived)
			}).finally(() => session.endSession())
		} catch (err) {
			if (err.name == 'DocumentNotFoundError') {
				const tx = await Transaction.findOne({
					_id: opid,
					type: 'receive',
					status: 'confirmed',
				}, {
					_id: 1
				})
				if (tx) {
					callback({
						code: 'TransactionConfirmed',
						message: `The transaction ${opid} is already confirmed`
					})
				} else {
					callback({
						code: 'TransactionNotFound',
						message: `No pending transaction with id '${opid}' found`
					})
				}
			} else if (err === 'OperationNotFound') {
				callback({
					code: 'OperationNotFound',
					message: `Could not find operation '${updtReceived.opid}'`
				})
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document after the update',
					details: err
				})
			} else if (err.name === 'CastError') {
				callback({
					code: 'CastError',
					message: err.message
				})
			} else {
				console.error('Error processing update_received_tx', err)
				callback({ code: 'InternalServerError' })
			}
		}
	})

	/**
	 * Processa requests de atualização de transações enviadas
	 */
	this._events.on('update_sent_tx', async (updtSent, callback) => {
		if (!updtSent.opid) return callback({
			code: 'BadRequest',
			message: '\'opid\' needs to be informed to update a transaction'
		})

		const session = await startSession()
		try {
			await session.withTransaction(async () => {
				const tx = await Transaction.findOne({
					_id: updtSent.opid,
					type: 'send',
				}, {}, { session }).orFail()

				// Atualiza a transação no database
				tx.txid = updtSent.txid
				tx.status = updtSent.status
				tx.timestamp = new Date(updtSent.timestamp)
				tx.confirmations = updtSent.status === 'confirmed' ? undefined : updtSent.confirmations
				await tx.save()

				if (updtSent.status === 'confirmed') {
					await Person.balanceOps.complete(tx.userId, this.name, tx._id, session)
				}

				callback(null, `${updtSent.opid} updated`)
				this.events.emit('update_sent_tx', tx.userId, updtSent)
			}).finally(() => session.endSession())
		} catch (err) {
			if (err.name == 'DocumentNotFoundError') {
				callback({
					code: 'TransactionNotFound',
					message: `No pending transaction with id: '${updtSent.opid}' found`
				})
			} else if (err === 'OperationNotFound') {
				callback({
					code: 'OperationNotFound',
					message: `Could not find operation '${updtSent.opid}'`
				})
			} else if (err.name === 'CastError') {
				callback({
					code: 'CastError',
					message: err.message
				})
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document after the update',
					details: err
				})
			} else {
				callback({ code: 'InternalServerError' })
				console.error('Error processing update_sent_tx', err)
			}
		}
	})
}
