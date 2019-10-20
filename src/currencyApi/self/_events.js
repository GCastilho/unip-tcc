/*
 * src/currencyApi/self/_events.js
 * 
 * Singleton de eventos da currencyApi, para permitir a comunicação entre os
 * módulos internos
 */

const EventEmitter = require('events')

class CurrencyApiEventEmitter extends EventEmitter {}

module.exports = new CurrencyApiEventEmitter()
