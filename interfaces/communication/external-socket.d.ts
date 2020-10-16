import type { WithdrawRequest, TxReceived, UpdtReceived, UpdtSent } from '../transaction'

/** Retorna um type apenas com as propriedades que são funções */
// eslint-disable-next-line @typescript-eslint/ban-types
type FilterFunctionsProperties<T extends object> = {
	[P in keyof T]: T[P] extends (...args: any) => any ? T[P] : never
}

interface RawMainEvents {
	create_new_account: () => string
	withdraw: (request: WithdrawRequest) => string
	cancell_withdraw: (opid: string) => string
}

export type MainEvents = FilterFunctionsProperties<RawMainEvents>

interface RawExternalEvents {
	new_transaction: (transaction: TxReceived) => string
	update_received_tx: (txUpdate: UpdtReceived) => string
	update_sent_tx: (updtSent: UpdtSent) => string
}

export type ExternalEvents = FilterFunctionsProperties<RawExternalEvents>

/**
 * Transforma as interfaces dos eventos em um padrão (...args, callback) => void
 * para ser usado na tipagem de event listeners
 */
export type ListenerFunctions<T extends ExternalEvents|MainEvents> = {
	[P in keyof T]: (
		...args: [
			...Parameters<T[P] extends (...args: any[]) => any ? T[P] : never>,
			(err: any, response?: ReturnType<T[P] extends (...args: any[]) => any ? T[P] : never>) => void
		]
	) => void
}
