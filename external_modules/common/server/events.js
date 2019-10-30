/*
 * external_modules/common/events.js
 * 
 * Singleton de eventos da currencyApi, para permitir a comunicação entre os
 * módulos internos
 */

const EventEmitter = require('events')

class ExternalModuleEventEmitter extends EventEmitter {}

module.exports = ExternalModuleEventEmitter
