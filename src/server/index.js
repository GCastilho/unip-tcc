import express from 'express'

const app = express()
const server = require('http').Server(app)

/** Setup router to handle all requests to subdirectories */
app.use(require('./root'))

module.exports = server
