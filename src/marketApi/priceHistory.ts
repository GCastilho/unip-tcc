import PriceHistory, { priceHistory } from '../db/models/priceHistory'
import { SuportedCurrencies } from '../libs/currencies'

/** O documento que contem os dados da entrada atual de priceHistory */
let doc: priceHistory | null
/** O tempo minimo que dura cada documento do historico de preço [ms] */
const changeTime = 60000

let time = new Date().setSeconds(0, 0) + changeTime

export default async function priceChange(newPrice: number, currencies: [SuportedCurrencies]) {
	if (time < Date.now() || !doc){
		time = new Date().setSeconds(0, 0) + changeTime
		doc = new PriceHistory({
			initPrice: doc?.finalPrice || newPrice,
			finalPrice: newPrice,
			maxPrice: newPrice,
			minPrice: newPrice,
			startTime: time,
			duration: changeTime,
			currencies
		})
	} else {
		doc.finalPrice = newPrice
		if (doc.maxPrice < newPrice) doc.maxPrice = newPrice
		else if (doc.minPrice > newPrice) doc.minPrice = newPrice
	}
	await doc.save()
}

/** @param durationTime o periodo que sera comprimido em um document
 *  @param currencies array das duas currencies que fazem o par de trade
 */
export async function periodicSummary( durationTime:number, currencies: [SuportedCurrencies]) {
	const batchSize = (durationTime / changeTime) - 1
	const doc = await PriceHistory.findOne({ duration: durationTime, }).sort({ $natural: -1 })
	const startTime = doc ? doc.startTime + durationTime : 0
	const docs = await PriceHistory.find({ startTime:{ $gte : startTime, $lt : startTime + durationTime }}).limit(batchSize)

	await new PriceHistory({
		initPrice: docs[0].initPrice,
		finalPrice: docs[docs.length - 1].finalPrice,
		maxPrice: Math.max(...docs.map(function(item) { return item.maxPrice })),
		minPrice: Math.min(...docs.map(function(item) { return item.maxPrice })),
		startTime,
		duration: durationTime,
		currencies
	}).save()
}
