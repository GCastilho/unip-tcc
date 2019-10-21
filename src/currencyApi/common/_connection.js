/*
 * src/currencyApi/common/_connection.js
 * 
 * Módulo privado para emitir eventos relacionados a conexão com o módulo
 * externo de cada currency
 * 
 * TODO: Fazer uma instância desse módulo por instância da currencyModule
 * (atualmente esse módulo é um singleton)
 */

const EventEmitter = require('events')

class ConnectionEventEmitter extends EventEmitter {}

const connection = new ConnectionEventEmitter()

/**
 * Garante apenas uma instância da connection_checker_loop() em execução
 * 
 * @type {Object} Contém informações se o connection_checker de uma currency
 * está em execução
 * @property {Boolean} {this.name} Info se o connection checker da
 * currency "this.name" está em execução
 * @static É o mesmo objeto independente da instância da currencyModule
 */
let looping = {}

/**
 * Inicializa a conexão com o módulo externo
 */
connection.connect = async function startModuleConnection() {
	bindEventListeners.bind(this)()
	try {
		if (await this._module.get('ping') != 'pong')
			throw new TypeError(`Unrecognized ${this.name} module response: ${data}`)
		this._connection.emit('connected-internal', this.name)
	} catch(err) {
		this.isOnline = false
		connection_checker_loop.bind(this)()
	}

	/** Previne que a connect seja executada novamente */
	delete connection.connect
}

function bindEventListeners() {
	/**
	 * Evita disparar um 'connected' quando já está conectado
	 */
	this._connection.on('connected-internal', function connectedParser(currency) {
		if (this.name === currency && !this.isOnline) {
			this.isOnline = true
			this._connection.emit('connected', this.name)
			console.log(`connected to the ${this.name} node`) //remove
		}
	})
	
	/**
	 * Evita disparar um 'disconnected' quando já está desconectado
	 */
	this._connection.on('disconnected-internal', function connectedParser(currency) {
		if (this.name === currency && this.isOnline) {
			this.isOnline = false
			this._connection.emit('disconnected', this.name)
			console.log(currency, 'disconnected') //remove
		}
	})

	/**
	 * Disparado quando há um erro de conexão com o módulo externo
	 */
	this._connection.on('error', async function errorParser(currency) {
		if (this.name === currency && this.isOnline) {
			try {
				if (await this._module.get('ping') != 'pong')
					throw new TypeError(`Unrecognized ${this.name} module response: ${data}`)
				this._connection.emit('connected-internal', this.name)
			} catch(err) {
				this._connection.emit('disconnected-internal', this.name)
				if (err instanceof TypeError)
					console.error(err.message)
				else
					console.error(`Error comunicating with ${this.name} module`)
				connection_checker_loop.bind(this)()
			}
		}
	})

	/**
	 * Disparado para indicar que o módulo externo enviou um request
	 */
	this._connection.on('incomming', function incommingParser(currency) {
		if (this.name === currency) {
			// Um incomming não necessariamente significa que o módulo está aceitando requests
			// this._connection.emit('connected-internal', this.name)
		}
	})
}

/**
 * Checa a conexão com o módulo externo, emitindo um 'connected-internal'
 * (com o nome da currency como primeiro argumento) ao se conectar
 */
function connection_checker_loop() {
	if (!looping[this.name]) {
		looping[this.name] = true;
		(async function loop() {
			try {
				if (await this._module.get('ping') != 'pong')
					throw new TypeError(`Unrecognized ${this.name} module response: ${data}`) 
				this._connection.emit('connected-internal', this.name)
				looping[this.name] = false
			} catch(err) {
				/** Roda essa função (a cada 10s) até conseguir se conectar */
				setTimeout(loop.bind(this), 10000)
			}
		}).bind(this)()
	}
}

module.exports = connection
