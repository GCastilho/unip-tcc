import Common from './common'

/**
 * Classe do módulo individual da Nano
 */
export class Nano extends Common {
	name = 'nano' as const
	code = 'nano' as const
	fee = 0.001 as const
	decimals = 30
}
