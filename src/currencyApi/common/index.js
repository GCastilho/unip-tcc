/*
 * src/currencyApi/currencyModule/index.js
 * 
 * Classe da currencyModule. Essa é a classe base dos módulos das currencies,
 * recebendo um objeto com os métodos individuais na inicialização
 * As propriedades do objeto passado ao contrutor serão inseridas diretamente
 * na currencyModule, sobrepondo os métodos desta se houver conflito
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

const normalizedPath = require("path").join(__dirname)

const methods = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(methods[filename.replace('.js', '')] = require(`./${filename}`))
)

module.exports = class {
	constructor(currencyProps) {
		if (typeof currencyProps != 'object')
			throw new TypeError(`Incorrect initialization of 'common'`)

		/** Insere os módulos desta pasta como métodos da classe */
		for (let method in methods) {
			this[method] = methods[method]
		}

		/**
		 * Insere as propriedades/métodos passados no constructor como métodos
		 * da classe, sobrepondo se há conflito
		 */
		for (let prop in currencyProps) {
			this[prop] = currencyProps[prop]
		}

		/**
		 * Instancia o EventListener interno para _essa_ instância da classe
		 */
		this._events = new this._events

		/**
		 * Funções 'constructor' são funções que devem ser executadas para
		 * inicializar módulos ou executar ações antes de retornar algo que deva
		 * ser acessível da currencyModule (como uma função), então ela é
		 * executada e substituída por ser valor de retorno
		 * 
		 * Funções 'init' servem para iniciar módulos ou executar ações mas seu
		 * valor de retorno não é necessário ou útil na currencyModule (por
		 * exemplo, inicializar event listeners). Como ela não retorna nada
		 * útil, a função é deletada para reduzir a poluição
		 */
		for (let method in this) {
			if (this[method].name === 'constructor') {
				this[method] = this[method]()
			}

			if (this[method].name === 'init') {
				this[method]()
				delete this[method]
			}
		}

		/**
		 * Indica se o módulo externo está online ou não
		 * 
		 * Essa variável só deve ser modificada pelo '_connection', devendo ser
		 * readOnly para todos os outros métodos
		 * 
		 * @type {Boolean}
		 */
		this.isOnline = undefined
	}
}
