import type { TxSend } from '../transaction'

// Nota pra implementação: Dar erro se n tiver o listener

/** Retorna um type apenas com as propriedades que são funções */
type FilterFunctionsProperties<T extends object> = {
	[P in keyof T]: T[P] extends (...args: any) => any ? T[P] : never
}

interface RawEvents {
	create_new_account: () => string
	withdraw: (transaction: TxSend) => string
	cancell_withdraw: (opid: string) => string
}

export type Events = FilterFunctionsProperties<RawEvents>
