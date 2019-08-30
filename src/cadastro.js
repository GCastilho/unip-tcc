/**
 * src/cadastro.js
 * 
 * @description Handler da página de cadastro
 */

const Router = require('express').Router()

Router.post('/', function(req, res) {
	res.send({ hello: 'world' })
})

module.exports = Router
