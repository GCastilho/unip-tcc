/*
 * src/currencyApi/self/events.js
 * 
 * Singleton de eventos públicos da currencyApi
 */

const EventEmitter = require('events')

class CurrencyApiPublicEventEmitter extends EventEmitter {}

module.exports = CurrencyApiPublicEventEmitter
