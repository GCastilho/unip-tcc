export as namespace Bitcoin

export type TransactionInfo = {
	txid: string
	amount: number
	confirmations: number
	time: number
	blockhash: string
	blockindex: number
	blocktime: number
	timereceived: number
	/** Whether this transaction could be replaced due to BIP125 (replace-by-fee); may be unknown for unconfirmed transactions not in the mempool */
	'bip125-replaceable': 'yes'|'no'|'unknown',
	details: {
		address: string,
		category: 'send'|'receive'|'generate'|'immature'|'orphan'
		amount: number
		label: string,
		vout: number,
	}[]
}

export type BlockInfo = {
	hash: string
	confirmations: number
	size: number
	strippedsize: number
	height: number
	version: number
	versionHex: string
	merkleroot: string
	time: number
	nonce: number
	bits: string
	difficulty: number
	chainwork: string
	nTx: number
	previousblockhash: string
	nextblockhash: string
}

export type ListSinceBlock = {
	transactions: {
		address: string
		category: 'send'|'receive'|'generate'|'immature'|'orphan'
		amount: number
		vout: number
		fee: number
		confirmations:number
		blockhash: string
		blockindex: number
		blocktime: number
		txid: string
		time: number
		timereceived: number
		'bip125-replaceable': 'yes'|'no'|'unknown'
		abandoned: boolean
		comment: string
		label: string
		to: string
	}[],
	lastblock: string
}

export type BlockchainInfo = {
	/** Current network name as defined in BIP70 */
	chain: 'main'|'test'|'regtest'
	/** The current number of blocks processed in the server */
	blocks: number
	/** The current number of headers we have validated */
	headers: number
	/** The hash of the currently best block */
	bestblockhash: string
	/** The current difficulty */
	difficulty: number
	/** Median time for the current best block */
	mediantime: number
	/** Estimate of verification progress [0..1] */
	verificationprogress: number
	/** (debug information) Estimate of whether this node is in Initial Block Download mode. */
	initialblockdownload: boolean
	/** Total amount of work in active chain, in hexadecimal */
	chainwork: string
	/** The estimated size of the block and undo files on disk */
	size_on_disk: number
	/** If the blocks are subject to pruning */
	pruned: boolean
	/** Lowest-height complete block stored (only present if pruning is enabled) */
	pruneheight: number
	/** Whether automatic pruning is enabled (only present if pruning is enabled) */
	automatic_pruning: boolean
	/** The target size used by pruning (only present if automatic pruning is enabled) */
	prune_target_size: number
	/** any network and blockchain warnings. */
	warnings: string
}
