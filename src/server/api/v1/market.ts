import { Router } from 'express'
import { authentication } from './middlewares'
import * as MarketApi from '../../../marketApi'

const router = Router()

// Chama o middleware de autenticação
router.use(authentication)

router.post('/orderbook', async (req, res) => {
	try {
		const opid = await MarketApi.add(req.userId, req.body)

		res.status(201).json({ opid })
	} catch (err) {
		if (err.name == 'ValidationError') {
			res.status(400).json({
				error: 'BadRequest',
				message: 'Error validating input'
			})
		} else {
			res.status(500).json({ error: 'InternalServerError' })
			console.error('Error inserting order into orderbook', err)
		}
	}
})

export default router
