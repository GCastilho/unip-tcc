/**
 * src/currencyApi/self/listener/index.js
 * 
 * Inicia o listener da currencyApi
 */

const get_functions = require('./functions/get')
const post_functions = require('./functions/post')
const app = require('./app')

module.exports = function init() {
	const self = {}
	self.api = this

	self.get = {}
	for (let f in get_functions) {
		self.get[f] = get_functions[f].bind(this)
	}

	self.post = {}
	for (let f in post_functions) {
		self.post[f] = post_functions[f].bind(this)
	}

	self.app = app
	self.app()
	delete self.app
}
