/*
 * src/currencyApi/common/_connection.js
 * 
 * Módulo privado para emitir eventos relacionados a conexão com o módulo
 * externo de cada currency
 */

const EventEmitter = require('events')

class ConnectionEventEmitter extends EventEmitter {}

const connection = new ConnectionEventEmitter()

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
			console.log(`connected with the ${this.name} node`) //remove
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
			this._connection.emit('connected-internal', this.name)
		}
	})
}

/**
 * Checa a conexão com o módulo externo, emitindo um 'connected-internal'
 * (com o nome da currency como primeiro argumento) ao se conectar
 * 
 * @todo Garantir que há apenas uma intância dessa função em execução
 */
async function connection_checker_loop() {
	try {
		if (await this._module.get('ping') != 'pong')
			throw new TypeError(`Unrecognized ${this.name} module response: ${data}`) 
		this._connection.emit('connected-internal', this.name)
	} catch(err) {
		/** Roda essa função (a cada 10s) até conseguir se conectar */
		setTimeout(connection_checker_loop.bind(this), 10000)
	}
}

module.exports = connection
