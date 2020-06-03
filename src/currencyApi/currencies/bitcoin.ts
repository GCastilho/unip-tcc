import Common from './common'

/**
 * Classe do módulo individual da Bitcoin
 */
export class Bitcoin extends Common {
	name = 'bitcoin' as const
	code = 'btc' as const
	fee = 0.000001 as const
}
