/*
 * src/currencyApi/common/_connection.js
 * 
 * Módulo privado para emitir eventos relacionados a conexão com o módulo
 * externo de cada currency
 */

const EventEmitter = require('events')

class ConnectionEventEmitter extends EventEmitter {}

module.exports = _connection = new ConnectionEventEmitter()
