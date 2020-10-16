/**
 * Assinatura do módulo validador das currencies; A lista da currencies que ele
 * suporta está propositalmente incompleta (com apenas as currencies utilizadas)
 * para reduzir span
 */
declare module 'multicoin-address-validator' {
	export function validate(
		address: string,
		currency: 'bitcoin'|'nano',
		networkType: 'prod'|'testnet'|'both',
	): boolean
}
