const express = require('express')
const path = require('path')

const app = express()
const port = process.env.PORT || 3001

/**@description Define paths for express configs */
const publicDirectoryPath = path.join(__dirname, '../public')
const reactPath = path.join(__dirname, '../client/build')

/**@description Setup static directory to serve */
app.use(express.static(reactPath))

/**@description Handler de todos os requests para /cadastro */
app.use('/cadastro', require('./cadastro'))

app.use('/*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'))
	//res.send('Express send Hello World!')
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
