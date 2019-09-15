const express = require('express')
const path = require('path')

/**@description Conecta ao mongodb */
const mongoose = require('./db/mongoose')

const app = express()
const port = process.env.PORT || 3001

/**@description Define paths for express configs */
const reactPath = path.join(__dirname, '../client/build')

/**@description Setup static directory to serve */
app.use(express.static(reactPath))

/**@description Handler de todos os requests para /cadastro */
app.use('/register', require('./register'))

/**@description Handler de todos os requests para /login */
app.use('/login', require('./login'))

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'))
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
