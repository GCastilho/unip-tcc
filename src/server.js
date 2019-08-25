const express = require('express')

const app = express()
const port = process.env.PORT || 3000

app.use('/', (req, res) => {
	res.send('Express send Hello World!')
})

app.listen(port, () => {
	console.log(`Server is up on port ${port}`)
})
