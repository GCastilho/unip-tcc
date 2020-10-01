import type { TxSend, TxReceived, UpdtReceived, UpdtSent } from '../transaction'

/** Retorna um type apenas com as propriedades que são funções */
// eslint-disable-next-line @typescript-eslint/ban-types
type FilterFunctionsProperties<T extends object> = {
	[P in keyof T]: T[P] extends (...args: any) => any ? T[P] : never
}

interface RawMainEvents {
	create_new_account: () => string
	withdraw: (transaction: TxSend) => string
	cancell_withdraw: (opid: string) => string
}

export type MainEvents = FilterFunctionsProperties<RawMainEvents>

interface RawExternalEvents {
	new_transaction: (transaction: TxReceived) => string
	update_received_tx: (txUpdate: UpdtReceived) => string
	update_sent_tx: (updtSent: UpdtSent) => string
}

export type ExternalEvents = FilterFunctionsProperties<RawExternalEvents>
