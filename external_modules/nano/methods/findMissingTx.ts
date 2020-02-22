import { TxReceived } from '../../common'
import { Nano } from '../index'
import { fromRawToNano } from '../utils/unitConverter'

/**
 * Procura por transações não computadas até a última transação salva no db
 * e as retorna em um array de Tx
 * 
 * @param account A account para checar o histórico de transações
 * @param lastBlock o utimo bloco recebido na account, armazenado no database
 */
export async function findMissingTx(this: Nano,
	account: string,
	lastBlock: string
): Promise<TxReceived[]|undefined> {
	const accountInfo = await this.rpc.accountInfo(account)
	const lastKnownBlock = lastBlock ? lastBlock : accountInfo.open_block

	const receiveArray: TxReceived[] = []
	let blockHash = accountInfo.frontier

	/** Segue a blockchain da nano até encontrar o lastKnownBlock */
	while (blockHash != lastKnownBlock) {
		const blockInfo = await this.rpc.blockInfo(blockHash)
		// pega apenas blocos de received que foram confirmados
		if (blockInfo.subtype === 'receive' && blockInfo.confirmed === 'true') {
			receiveArray.push({
				txid: blockHash,
				account: blockInfo.block_account,
				status: 'confirmed',
				amount: fromRawToNano(blockInfo.amount),
				timestamp: parseInt(blockInfo.local_timestamp)
			})
		}
		blockHash = blockInfo.contents.previous
	}

	return receiveArray.reverse()
}
