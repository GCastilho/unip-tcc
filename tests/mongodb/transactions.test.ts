import '../../src/libs'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Transaction from '../../src/db/models/transaction'

describe('Testing transactions collection', () => {
	it('Should fail to save a transaction with negative amount', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: -1,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be
			.rejectedWith('-1.0 must be a positive number')
	})

	it('Should fail to save a transaction with invalid account')

	it('Should truncate the amount of the amount after the supported for that currency', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await tx.validate()
		expect(tx.amount.toFullString()).to.equals('1.12345678')
	})

	it('Should save a transaction', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be.fulfilled
	})
})
