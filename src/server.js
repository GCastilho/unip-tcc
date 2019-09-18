const express = require('express')
const path = require('path')

/**@description Conecta ao mongodb */
const mongoose = require('./db/mongoose')

const app = express()
const port = process.env.PORT || 3001

/**@description Path for react production build */
const reactPath = path.join(__dirname, '../public')

/**@description Setup static directory to serve */
app.use(express.static(reactPath))

/**@description Handler de todos os requests para /cadastro */
app.use('/cadastro', require('./cadastro'))

/**@description Handler de todos os requests para /login */
app.use('/login', require('./login'))

app.get('*', (req, res) => {
	res.sendFile(path.join(reactPath, 'index.html'))
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
