import PriceHistory, { priceHistory } from '../db/models/priceHistory'
import { SuportedCurrencies } from '../libs/currencies'
/** O documento que contem os dados da entrada atual de priceHistory */
export let doc: priceHistory | null
const changeTime = 10000
let time = Date.now() + changeTime

export default async function priceChange(newPrice: number, currencies: [SuportedCurrencies]) {
	if (time < Date.now() || !doc){

		time = Date.now() + changeTime

		doc = new PriceHistory({
			initPrice: doc?.finalPrice || newPrice,
			finalPrice: newPrice,
			maxPrice: newPrice,
			minPrice: newPrice,
			startTime: Date.now(),
			duration: changeTime,
			currencies
		})
		await doc.save()
	} else {
		doc.finalPrice = newPrice
		if (doc.maxPrice < newPrice) doc.maxPrice = newPrice
		else if (doc.minPrice > newPrice) doc.minPrice = newPrice
		await doc.save()
	}
}

