
import {Bitcoin} from '../index';
import meta from '../../common/db/models/meta'

export async function rewindTransactions(this: Bitcoin,newBlockhash : string) {

	let blockhash = (await meta.findOne({info: 'lastSyncBlock'}))?.details

	if (!blockhash) {
		blockhash = (await this.rpc.blockInfo(newBlockhash))?.previousblockhash
		if (!blockhash)
			return
		
		meta.updateOne({
			info: 'lastSyncBlock',
			details: blockhash
		}, {}, {
			upsert: true
		}).exec()
	}
	console.log(blockhash);
	const {transactions}: any = await this.rpc.listSinceBlock(blockhash);
	
	transactions.forEach(async transaction => {
		await this.processTransaction(transaction.txid);
	});
	meta.updateOne({
		info: 'lastSyncBlock',
		details: newBlockhash
	}, {}, {
		upsert: true
	}).exec()

}
