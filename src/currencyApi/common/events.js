/*
 * src/currencyApi/currencyModule/events.js
 *
 * EventEmmiter público da currencyModule
 * 
 * Esse módulo deve ser inicializado no construtor de cada instância da
 * currencyModule para ser individual
 */

const EventEmitter = require('events')

class CurrencyModulePublicEventEmitter extends EventEmitter {}

module.exports = CurrencyModulePublicEventEmitter
