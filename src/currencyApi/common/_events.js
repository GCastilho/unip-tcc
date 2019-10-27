/*
 * src/currencyApi/currencyModule/_events.js
 *
 * EventEmmiter interno de cada currencyModule
 * 
 * Esse módulo deve ser inicializado no construtor de cada instância da
 * currencyModule para ser individual
 */

const EventEmitter = require('events')

class CurrencyModuleInternalEventEmitter extends EventEmitter {}

module.exports = CurrencyModuleInternalEventEmitter
