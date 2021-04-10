import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Transaction, { CreateReceive, CreateSend, Receive, Send } from '../../db/models/transaction'
import { mockedCurrencyApi, WithdrawTestCommon } from './setup'

describe('Testing updateTx from Common', () => {
	const currency = 'test-currency'
	let currencyApi: ReturnType<typeof mockedCurrencyApi>
	let common: WithdrawTestCommon // Implementação genérica da common

	before(done => {
		currencyApi = mockedCurrencyApi(currency)

		const genericEventCallback = (arg, callback) => {
			callback(null, 'received')
		}

		currencyApi.of(currency).on('connection', socket => {
			socket.on('update_sent_tx', genericEventCallback)
			socket.on('new_transaction', genericEventCallback)
			socket.on('update_received_tx', genericEventCallback)
			done()
		})

		common = new WithdrawTestCommon({ name: currency })
		common.init().catch(done)
	})

	after(() => {
		currencyApi.close()
		common.close()
	})

	beforeEach(() => Transaction.deleteMany({}))

	it('Should update multiple receive transactions with the same txid', async () => {
		const txData: Omit<CreateReceive, 'type'|'amount'> = {
			txid: 'same-txid',
			status: 'pending',
			account: 'random-account',
			timestamp: new Date()
		}

		const txs = await Promise.all([1, 2, 3].map(amount => ({
			...txData,
			opid: new ObjectId(), // Impede o new_transaction de ser emitido
			amount,
			account: `${txData.account}-${amount}`,
			type: 'receive' as const,
		})).map(tx => Receive.create(tx)))

		await common.updateTx({
			status: 'confirmed',
			txid: txData.txid,
		})

		const updatedTxs = await Receive.find({
			txid: txData.txid,
			status: 'confirmed',
		})

		expect(updatedTxs).to.have.lengthOf(txs.length)
	})

	it('Should update multiple sent transactions with the same txid', async () => {
		const txData: Omit<CreateSend, 'type'|'amount'|'opid'> = {
			txid: 'same-txid',
			status: 'pending',
			account: 'random-account',
			timestamp: new Date()
		}

		const txs = await Promise.all([1, 2, 3].map(amount => ({
			...txData,
			opid: new ObjectId(),
			amount,
			account: `${txData.account}-${amount}`,
			type: 'send' as const,
		})).map(tx => Send.create(tx)))

		await common.updateTx({
			status: 'confirmed',
			txid: txData.txid,
		})

		const updatedTxs = await Send.find({
			txid: txData.txid,
			status: 'confirmed',
		})

		expect(updatedTxs).to.have.lengthOf(txs.length)
	})
})
