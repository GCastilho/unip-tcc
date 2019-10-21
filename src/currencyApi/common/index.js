/*
 * src/currencyApi/currencyModule/index.js
 * 
 * Classe da currencyModule. Essa é a classe base dos módulos das currencies,
 * recebendo um objeto com os métodos individuais na inicialização
 * As propriedades do método passado para o contrutor serão inseridas
 * diretamente na currencyModule, sobrepondo os métodos desta se houver conflito
 * 
 * Cada método/propriedade dessa classe pode ser escrita diretamente na classe
 * ou colocada no exports de um dos outros módulos desta pasta, que serão lidos
 * no momento que esse arquivo for executado (não na instanciação da classe). Os
 * módulos lidos serão inseridos na instanciação como um método com o mesmo
 * nome do arquivo em que ele estava (sem o .js). Ex.: o método this.modulo será
 * o retorno de um require('modulo.js') contido nessa pasta
 * 
 * Por serem métodos dessa classe, todas as *funções* filhas tem o 'this' na
 * classe, podendo acessar qualquer método da mesma
 */

const _ = require('lodash')
const normalizedPath = require("path").join(__dirname)

const methods = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(methods[filename.replace('.js', '')] = require(`./${filename}`))
)

module.exports = class {
	constructor(currencyProps) {
		if (!currencyProps || typeof currencyProps != 'object')
			throw new TypeError(`Incorrect initialization of 'common'`)

		/** Insere os métodos exportados pelos módulos individuais */
		for (let method in methods) {
			typeof methods[method] === 'object' ?
				this[method] = _.cloneDeep(methods[method]) :
				this[method] = methods[method]
			
			/** Da bind nas funções dos métodos */
			for (let prop in this[method]) {
				if (typeof this[method][prop] === 'function') {
					this[method][prop] = this[method][prop].bind(this)
				}
			}
		}

		/**
		 * Insere as propriedades individuais na classe, sobrepondo
		 * se há conflito
		 */
		for (let prop in currencyProps) {
			this[prop] = currencyProps[prop]
		}

		/**
		 * Funções 'init' servem para iniciar módulos ou executar ações quando
		 * a currencyModule é iniciada; elas não são funções reais acessíveis do
		 * módulo, mas sim funções inicializadoras, tendo sido projetadas com o
		 * intuito de poder inicializar event listeners de dentro do módulo
		 * de uma currency
		 * A função é deletada para evitar poluição e que ela seja executada
		 * novamente
		 */
		for (let method in this) {
			if (this[method].name === 'init') {
				this[method]()
				delete this[method]
			}
		}

		/**
		 * Indica se o módulo externo está online ou não
		 * 
		 * Essa variável NÃO deve ser modificada diretamente, mas
		 * somente pelo '_connection'
		 * 
		 * @type {Boolean}
		 */
		this.isOnline = undefined
	}
}
