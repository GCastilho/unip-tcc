/*
 * src/currencyApi/self/getCurrenciesList.js
 * 
 * Retorna um array com o 'name' e o 'code' de cada currency
 */

module.exports = function constructor() {
	const currenciesList = []
	Object.values(this.currencies).forEach(currency => {
		currenciesList.push({
			code: currency.code,
			name: currency.name
		})
	})

	return getCurrenciesList = () => currenciesList
}
