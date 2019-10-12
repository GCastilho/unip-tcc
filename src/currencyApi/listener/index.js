/*
 * src/currencyApi/listener/index.js
 *
 * Esse módulo prepara a API do listener e o inicia
 */

const functions = require('./functions')
const currencies = require('../currencies')

/**
 * Um módulo com todas as funções disponibilizadas publicamente pelo listener
 * categorizas por currency, ou seja, é um conjunto api.<currency>.<function>
 */
const api = {}
for (let currency in currencies) {
	api[currency] = { ...functions, ...currencies[currency] }
}

/** Inicia o listener da currencyApi */
module.exports = app = require('./app')(api)
