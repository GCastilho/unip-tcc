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
			startTime: Date.now(),
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
