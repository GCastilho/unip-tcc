import path from 'path'
import express from 'express'

const Router = express.Router()

/** Handler dos arquivos estáticos do sapper */
Router.use(express.static(path.join(__dirname, '../../../public')))

/** Handler de todos os requests para /register */
Router.use('/register', require('./register'))

/** Handler de todos os requests para /login */
Router.use('/login', require('./login'))

module.exports = Router
