const express = require('express')
const path = require('path')
const app = express()

/** Connect to mongodb */
require('./db/mongoose')

/** Load CurrencyApi module */
require('./currencyApi')

/** Setup path for react production build and static files */
app.use(express.static(path.join(__dirname, '../public')))

/** Setup router to handle all requests to subdirectories */
app.use(require('./router'))

module.exports = app
