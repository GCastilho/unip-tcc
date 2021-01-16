import { blockInfo as getBlockInfo, accountInfo } from './rpc'
import { fromRawToNano } from '../utils/unitConverter'
import type { Nano } from '../index'
import type { NewTransaction } from '../../common'

/**
 * Procura por transações não computadas até a última transação salva no db
 * e as retorna em um array de Tx
 *
 * @param account A account para checar o histórico de transações
 * @param lastBlock o utimo bloco recebido na account, armazenado no database
 */
export async function findMissingTx(this: Nano,
	account: string,
	lastBlock?: string
): Promise<NewTransaction[]> {
	const { open_block, frontier } = await accountInfo(account)
	const lastKnownBlock = lastBlock || open_block

	const receiveArray: NewTransaction[] = []
	let blockHash = frontier

	/** Segue a blockchain da nano até encontrar o lastKnownBlock */
	while (blockHash != lastKnownBlock) {
		const blockInfo = await getBlockInfo(blockHash)
		// Pega apenas blocos de received que foram confirmados
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
