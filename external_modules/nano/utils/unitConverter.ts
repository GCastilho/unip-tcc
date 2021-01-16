/**
 * Converte um valor em raw para um valor em NANO
 *
 * @param amount O valor em raw que será convertido
 */
export function fromRawToNano(amount: string): string {
	if (!amount) amount = '0'
	if (amount.includes('.') || amount.includes('-'))
		throw new Error('IllegalInput')

	// Garante q o número tem a qtd de caracteres da qtd de casas decimais
	const _amount = amount.padStart(30 + 1, '0')

	// Separa o decimal do inteiro usando o numero de casas decimais como separador
	const inteiro = _amount.slice(0, -30)
	const casas = _amount.slice(-30)

	return `${inteiro}.${casas}`
}

/**
 * Converte um valor em NANO para um valor em raw
 *
 * @param amount O valor em NANO que será convertido
 */
export function fromNanoToRaw(amount: string): string {
	if (!amount) amount = '0.0'
	if (!amount.includes('.') || amount.includes('-'))
		throw new Error('IllegalInput')

	// Separa o inteiro dos decimais
	// eslint-disable-next-line
	let [inteiro, casas] = amount.split('.')

	// Preenche as casas restantes com zeros e remove zeros além da casa 30
	casas = casas.padEnd(30, '0').slice(0, 30)

	let raw = `${inteiro}${casas}`

	// Remove os zeros extras do começo da string
	while (raw.charAt(0) === '0') {
		raw = raw.substr(1)
	}

	return raw
}
