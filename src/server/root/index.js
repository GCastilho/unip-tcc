import path from 'path'
import express from 'express'

const root = express.Router()

/** Handler dos arquivos estáticos do sapper */
root.use(express.static(path.join(__dirname, '../../../public')))

/** Handler de todos os requests para /register */
root.use('/register', require('./register'))

/** Handler de todos os requests para /login */
root.use('/login', require('./login'))

export default root
