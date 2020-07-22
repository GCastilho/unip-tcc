import path from 'path'
import express from 'express'

const root = express.Router()

/** Handler dos arquivos estáticos do sapper */
root.use(express.static(path.join(__dirname, '../../../public')))

export default root
