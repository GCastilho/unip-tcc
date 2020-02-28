import express from 'express'
import path from 'path'

const app = express()
const server = require('http').Server(app)

/** Setup path for static exported sapper files */
app.use(express.static(path.join(__dirname, '../public')))

/** Setup router to handle all requests to subdirectories */
app.use(require('./router'))

module.exports = server
