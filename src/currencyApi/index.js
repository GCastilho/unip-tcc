/*
 * src/currencyApi/index.js
 *
 * Endpoint do servidor principal com os módulos conectores das blockchains
 * 
 * Esse módulo exporta o singleton da currencyApi que tem métodos modulares
 * (separados em arquivos e pastas) que são montados no momento da instanciação
 * dessa módulo
 * 
 * A currencyApi tem o método (privado) da currencyModule, que tem a comunicação
 * direta com cada um das currencies, as funções 'self', que são as funções da
 * API de fato e o módulo 'currencies', que tem implementações privadas de cada
 * uma das currencies suportadas
 */

const currencies = require('./currencies')
const currencyModule = require('./common')
const self = require('./self')

class CurrencyApi {
	constructor() {
		/**
		 * Contém os métodos e propriedades internas de cada currency em
		 * um método interno com o nome dessa currency
		 */
		this.currencies = {}

		/**
		 * Inicializa o módulo interno de cada uma das currencies, usando a
		 * common como base e passando as propriedades e funções individuais
		 * de cada currency ao contrutor para que cada instância seja única
		 * para cada currency (um método no módulo individual sobrescreve um
		 * método da common com o mesmo nome)
		 */
		for (let currency in currencies) {
			this.currencies[currency] = new currencyModule(currencies[currency])
		}

		/** Insere os métodos da currencyApi, acessíveis por 'this.<method>' */
		for (let method in self) {
			this[method] = self[method]
		}
	}
}

module.exports = currencyApi = new CurrencyApi()

/** Load listener module */
require('./listener')
