const express = require('express')
const path = require('path')

/**@description Conecta ao mongodb */
const mongoose = require('./db/mongoose')

const app = express()
const port = process.env.PORT || 3000

/**@description Handler de todos os requests para /cadastro */
app.use('/cadastro', require('./cadastro'))

/**@description Handler de todos os requests para /login */
app.use('/login', require('./login'))

app.use('/', (req, res) => {
	res.send('Express send Hello World!')
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
