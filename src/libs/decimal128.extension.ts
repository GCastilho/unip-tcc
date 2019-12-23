import { Decimal128 } from 'bson'

declare module 'bson' {
	// Extends the bson.Decimal128's prototype
	interface Decimal128 {
		/**
		 * Returns a string representation of the decimal128 with the
		 * exponentiation expanded
		 */
		toFullString(): string
		/**
		 * Returns the absolute value of this Decimal28 (the value without
		 * regard to whether it is positive or negative). For example, the
		 * absolute value of -5 is the same as the absolute value of 5
		 */
		abs(): Decimal128
	}
	// Extends the bson.Decimal128 object
	namespace Decimal128 {
		/**
		 * Create a Decimal128 instance from a number or numeric string with the
		 * possibility to truncate numbers beyond a specified decimal place
		 * 
		 * @param value a number or numeric string representation
		 * @param decimals the maximum number of significant decimal places
		 */
		export function fromNumeric(value: string|number, decimals?: number): Decimal128
	}
}

/**
 * Converte um decimal128 para string expandindo a exponenciação, caso tenha
 */
Decimal128.prototype.toFullString = function decimal128ToString() {
	let [base, expoente] = this.toString().toLowerCase().split('e')
	if (!expoente) expoente = '0'

	let [inteiro, casas] = base.split('.')
	if (!casas) casas = '0'

	if (+expoente === 0) return inteiro.concat('.').concat(casas)

	// Expande a exponenciação
	if (+expoente > 0) {
		// Garante a quantidade mínima de casas do expoente
		casas = casas.padEnd(+expoente+1, '0')

		// Separa 'casas' no expoente; _a é antes, _b é depois
		const _a = casas.slice(0, +expoente)
		const _b = casas.slice(+expoente)

		casas = _a.concat('.').concat(_b)
	} else {
		// Garante a quantidade mínima de casas do expoente
		if (inteiro.charAt(0) === '-') {
			inteiro = inteiro.slice(1)
			inteiro = inteiro.padStart(-1*+expoente+1, '0')
			inteiro = '-'.concat(inteiro)
		} else {
			inteiro = inteiro.padStart(-1*+expoente+1, '0')
		}

		// Separa o inteiro no expoente
		const _a = inteiro.slice(0, +expoente)
		const _b = inteiro.slice(+expoente)

		inteiro = _a.concat('.').concat(_b)
	}

	let numero = inteiro.concat(casas)

	// Remove os zeros extras
	let index = 0
	while (
		numero.length > index
		&& numero.charAt(index) === '0'
		&& numero.charAt(index+1) != '.'
	) {
		numero = numero.substr(0, index) + '' + numero.substr(index + 1)
		index++
	}

	index = numero.length - 1
	while (
		index >= 0
		&& numero.charAt(index) === '0'
		&& numero.charAt(index-1) != '.'
	) {
		numero = numero.substr(0, index) + '' + numero.substr(index + 1)
		index--
	}

	return numero
}

/**
 * Retorna o valor absoluto de um Decimal128 sem alterar o valor original
 */
Decimal128.prototype.abs = function abs() {
	return Decimal128.fromString(this.toString().replace(/^-/, ''))
}

/**
 * Converte um valor para Decimal128
 * @param value O valor que será convertido
 * @param decimals Um valor opcional de casas decimais para truncar
 */
Decimal128.fromNumeric = function toDecimal128(value, decimals = 0) {
	let _value = value.toString()
	// Corta as casas que vão alem da quantidade de decimais estabelecidos
	if (decimals) {
		let [inteiro, casas] = _value.split('.')
		casas = casas.slice(0, decimals)
		value = inteiro.concat('.').concat(casas)
	}
	return Decimal128.fromString(_value)
}
