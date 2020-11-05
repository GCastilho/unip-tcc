import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { authentication } from './middlewares'
import * as MarketApi from '../../../marketApi'

const router = Router()

router.get('/orderbook/depth', async (req, res) => {
	if (
		typeof req.query.base != 'string' || typeof req.query.target != 'string'
	) return res.status(400).send({
		error: 'BadRequest',
		message: 'The the params are not of type "string"'
	})
	try {
		const marketDepth = await MarketApi.getMarketDepth(req.query.base, req.query.target)

		res.status(200).send(marketDepth)
	} catch (err) {
		if (err.name == 'MarketNotFound') {
			res.status(404).send({
				error: 'Market Not Found',
				message: err.message
			})
		} else {
			res.status(500).send({ error: 'InternalServerError' })
			console.error(`Error while geting the market depht of ${req.query.base} - ${req.query.target} :`, err)
		}
	}
	return
})

router.get('/price', async (req, res) => {
	if (
		typeof req.query.base != 'string' || typeof req.query.target != 'string'
	) return res.status(400).send({
		error: 'BadRequest',
		message: 'The the params are not of type "string"'
	})
	try {
		const marketPrice = await MarketApi.getMarketPrice(req.query.base, req.query.target)
		res.status(200).send(marketPrice)
	} catch (err) {
		if (err.name == 'MarketNotFound') {
			res.status(404).send({
				error: 'Market Not Found',
				message: err.message
			})
		} else {
			res.status(500).send({ error: 'InternalServerError' })
			console.error(`Error while geting the market price of ${req.query.base} - ${req.query.target} :`, err)
		}
	}
	return
})

// Chama o middleware de autenticação
router.use(authentication)

router.post('/orderbook', async (req, res) => {
	try {
		const opid = await MarketApi.add(req.userId, req.body)

		res.status(201).send({ opid })
	} catch (err) {
		if (err.name == 'ValidationError') {
			res.status(400).send({
				error: 'BadRequest',
				message: 'Error validating input'
			})
		} else if (err == 'NotEnoughFunds') {
			res.status(403).send({
				error: 'NotEnoughFunds',
				message: 'There are not enough funds on your account to perform this operation'
			})
		} else {
			res.status(500).send({ error: 'InternalServerError' })
			console.error('Error inserting order into orderbook', err)
		}
	}
})

router.delete('/orderbook/:opid', async (req, res) => {
	try {
		if (!ObjectId.isValid(req.params.opid)) throw 'BadRequest'
		await MarketApi.remove(req.userId, new ObjectId(req.params.opid))
		res.json({ message: 'Success' })
	} catch (err) {
		switch (err) {
			case('BadRequest'):
				res.status(400).send({
					error: 'Bad Request',
					message: `The opid '${req.params.opid}' is not a valid operation id`
				})
				break
			case('OrderNotFound'):
				res.status(404).send({
					error: 'Not Found',
					message: 'The requested operation could not be found on the market'
				})
				break
			case('NotEnoughFunds'):
				res.status(403).send({
					error: 'NotEnoughFunds',
					message: 'There are not enough funds on your account to perform this operation'
				})
				break
			default:
				console.error('Error removing order from market', err)
				res.status(500).send({ error: 'Internal Server Error' })
		}
	}
})

export default router
