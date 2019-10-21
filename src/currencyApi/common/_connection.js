/*
 * src/currencyApi/common/_connection.js
 * 
 * Módulo privado para emitir e ouvir por eventos relacionados a conexão com o
 * módulo externo de cada currency
 */

const _events = require('../self/_events')

module.exports = async function init() {
	/**
	 * Garante apenas uma instância da connection_checker_loop() em execução
	 * 
	 * @type {Boolean}
	 */
	let looping = false

	/**
	 * Evita disparar um 'connected' quando já está conectado
	 */
	_events.on('_connected', connectedParser = (currency) => {
		if (this.name === currency && !this.isOnline) {
			this.isOnline = true
			_events.emit('connected', this.name)
			console.log(`connected to the ${this.name} node`) //remove
		}
	})
	
	/**
	 * Evita disparar um 'disconnected' quando já está desconectado
	 */
	_events.on('_disconnected', connectedParser = (currency) => {
		if (this.name === currency && this.isOnline) {
			this.isOnline = false
			_events.emit('disconnected', this.name)
			connection_checker_loop()
			console.log(currency, 'disconnected') //remove
		}
	})

	/**
	 * Disparado quando há um erro de conexão com o módulo externo
	 */
	_events.on('error', errorParser = async (currency) => {
		if (this.name === currency && this.isOnline) {
			try {
				if ((res = await this._module.get('ping')) != 'pong')
					throw new TypeError(`Unrecognized ${this.name} module response: ${res}`)
				_events.emit('_connected', this.name)
			} catch(err) {
				if (err instanceof TypeError)
					console.error(err.message)
				else
					console.error(`Error comunicating with ${this.name} module`)
				_events.emit('_disconnected', this.name)
			}
		}
	})

	/**
	 * Disparado para indicar que o módulo externo enviou um request
	 */
	_events.on('incomming', incommingParser = (currency) => {
		if (this.name === currency) {
			// connection_checker_loop()
		}
	})

	/**
	 * Checa a conexão com o módulo externo, emitindo um '_connected'
	 * (com o nome da currency como primeiro argumento) ao se conectar
	 */
	const connection_checker_loop = () => {
		if (!looping) {
			looping = true;
			(loop = async () => {
				try {
					if ((res = await this._module.get('ping')) != 'pong')
						throw new TypeError(`Unrecognized ${this.name} module response: ${res}`)
					_events.emit('_connected', this.name)
					looping = false
				} catch(err) {
					if (err instanceof TypeError)
						console.error(err.message)
					/** Roda essa função (a cada 10s) até conseguir se conectar */
					setTimeout(loop, 10000)
				}
			})()
		}
	}

	/**
	 * Inicializa a conexão com o módulo externo
	 */
	try {
		if (await this._module.get('ping') != 'pong')
			throw new TypeError(`Unrecognized ${this.name} module response`)
		_events.emit('_connected', this.name)
	} catch(err) {
		this.isOnline = false
		connection_checker_loop()
	}
}
