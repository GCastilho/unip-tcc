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

		/**
		 * Instancia o EventEmitter interno da currencyApi
		 */
		this._events = new this._events

		/**
		 * Instancia o EventEmitter público da currencyApi
		 */
		this.events = new this.events

		/**
		 * Funções 'constructor' são funções que devem ser executadas para
		 * inicializar módulos ou executar ações antes de retornar algo que deva
		 * ser acessível da currencyApi (como uma função), então ela é
		 * executada e substituída por ser valor de retorno
		 */
		for (let method in this) {
			if (this[method].name === 'constructor') {
				this[method] = this[method]()
			}
		}

		/**
		 * Funções 'init' servem para iniciar módulos ou executar ações mas seu
		 * valor de retorno não é necessário ou útil na currencyApi (por
		 * exemplo, inicializar event listeners). Como ela não retorna nada
		 * útil, a função é deletada para reduzir a poluição
		 * 
		 * Nota: Todas as funções 'constructor' devem ter sido executadas antes
		 * das funções init para garantir que todos os métodos da currencyApi
		 * tenham sido inicializados e estejam acessíveis
		 */
		for (let method in this) {
			if (this[method].name === 'init') {
				this[method]()
				delete this[method]
			}
		}
	}
}

module.exports = currencyApi = new CurrencyApi()
