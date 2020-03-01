/*
 * src/routers.index.js
 */

const Router = require('express').Router()

/**@description Handler de todos os requests para /register */
Router.use('/register', require('./register'))

/**@description Handler de todos os requests para /login */
Router.use('/login', require('./login'))

/**@description Handler de todos os requests para /user */
Router.use('/user', require('./user'))

module.exports = Router
