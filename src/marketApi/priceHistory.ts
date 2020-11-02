import { events } from './index'
import PriceHistory from '../db/models/priceHistory'
import { SuportedCurrencies as SC } from '../libs/currencies'

/** O documento que contem os dados da entrada atual de priceHistory */
//let doc: priceHistory | null
/** O tempo minimo que dura cada documento do historico de preço [ms] */
const changeTime = 60000

let time = new Date().setSeconds(0, 0) + changeTime

events.on('price_update', async priceUpdt => {
	let doc = await PriceHistory.findOne({
		startTime: new Date().setSeconds(0, 0),
		currencies: priceUpdt.currencies
	})
	if (!doc || doc.startTime + changeTime < Date.now() ){
		time = new Date().setSeconds(0, 0)
		doc = new PriceHistory({
			open: doc?.close || priceUpdt.price,
			close: priceUpdt.price,
			high: priceUpdt.price,
			low: priceUpdt.price,
			startTime: time,
			duration: changeTime,
			currencies: priceUpdt.currencies
		})
	} else {
		doc.close = priceUpdt.price
		if (doc.high < priceUpdt.price) doc.high = priceUpdt.price
		else if (doc.low > priceUpdt.price) doc.low = priceUpdt.price
	}
	await doc.save()
})


/** @param durationTime o periodo que sera comprimido em um document
 *  @param currencies array das duas currencies que fazem o par de trade
 */
export async function periodicSummary(durationTime:number, currencies: [SC, SC]) {
	const batchSize = (durationTime / changeTime) - 1
	const doc = await PriceHistory.findOne({ duration: durationTime, currencies }).sort({ $natural: -1 })
	let startTime = doc ?
		doc.startTime + durationTime :
		(await PriceHistory.findOne({ duration: changeTime, currencies }))?.startTime

	if (!startTime) return

	//garantindo que o tempo inicial seja no começo redondo 00:00 , 00:09 por exemplo
	startTime = startTime - (startTime % durationTime)

	do {
		const docs = await PriceHistory.find({
			startTime:{
				$gte : startTime,
				$lt : startTime + durationTime
			},
			currencies,
			duration: changeTime
		}).limit(batchSize)

		if (docs.length == 0) {
			startTime += durationTime
			continue
		}

		await new PriceHistory({
			initPrice: docs[0].open,
			finalPrice: docs[docs.length - 1].close,
			maxPrice: Math.max(...docs.map(function(item) { return item.high })),
			minPrice: Math.min(...docs.map(function(item) { return item.low })),
			startTime,
			duration: durationTime,
			currencies
		}).save()

		startTime += durationTime

	} while ( startTime < Date.now() )
}
