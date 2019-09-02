const express = require('express')
const path = require('path')

/**@description Conecta ao mongodb */
const mongoose = require('./db/mongoose')

const app = express()
const port = process.env.PORT || 3000

/**@description Define paths for express configs */
const publicDirectoryPath = path.join(__dirname, '../public')

/**@description Setup static directory to serve */
app.use(express.static(publicDirectoryPath))

/**@description Handler de todos os requests para /cadastro */
app.use('/cadastro', require('./cadastro'))

app.use('/', (req, res) => {
	res.send('Express send Hello World!')
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
