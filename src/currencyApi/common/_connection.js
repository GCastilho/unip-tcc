/*
 * src/currencyApi/common/_connection.js
 * 
 * Módulo privado para emitir e ouvir por eventos relacionados a conexão com o
 * módulo externo de cada currency
 */

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
	this._events.on('_connected', connectedParser = () => {
		if (!this.isOnline) {
			this.isOnline = true
			this._events.emit('connected')

			console.log(`Connected to the '${this.name}' node`) //remove
		}
	})
	
	/**
	 * Evita disparar um 'disconnected' quando já está desconectado
	 */
	this._events.on('_disconnected', connectedParser = () => {
		if (this.isOnline) {
			this.isOnline = false
			this._events.emit('disconnected')
			connection_checker_loop()
			
			console.log(`Disconnected from the '${this.name}' node`) //remove
		}
	})

	/**
	 * Disparado quando há um erro de conexão com o módulo externo
	 */
	this._events.on('error', errorParser = async () => {
		if (this.isOnline) {
			try {
				if ((res = await this._module.get('ping')) != 'pong')
					throw new TypeError(`Unrecognized ${this.name} module response: ${res}`)
				this._events.emit('_connected')
			} catch(err) {
				if (err instanceof TypeError)
					console.error(err.message)
				else
					console.error(`Error comunicating with ${this.name} module`)
				this._events.emit('_disconnected')
			}
		}
	})

	/**
	 * Checa a conexão com o módulo externo, emitindo um '_connected'
	 * (com o nome da currency como primeiro argumento) ao se conectar
	 */
	const connection_checker_loop = () => {
		if (!looping) {
			looping = true
			;(loop = async () => {
				try {
					if ((res = await this._module.get('ping')) != 'pong')
						throw new TypeError(`Unrecognized ${this.name} module response: ${res}`)
					this._events.emit('_connected')
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
		this._events.emit('_connected')
	} catch(err) {
		this.isOnline = false
		connection_checker_loop()
	}
}
