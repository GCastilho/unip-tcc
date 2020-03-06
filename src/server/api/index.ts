import express from 'express'

const router = express.Router()

// Remove
router.use('/', (_req, res) => {
	res.send({ message: 'Api Root' })
})

module.exports = router
