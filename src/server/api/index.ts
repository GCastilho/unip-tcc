import express from 'express'

const api = express.Router()

// Remove
api.use('/', (_req, res) => {
	res.send({ message: 'Api Root' })
})

export default api
