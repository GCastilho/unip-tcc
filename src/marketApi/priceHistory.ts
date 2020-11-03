import { events } from './index'
import PriceHistory from '../db/models/priceHistory'
import type { SuportedCurrencies as SC } from '../libs/currencies'

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


/**
 * @param durationTime o periodo que sera comprimido em um document
 * @param currencies array das duas currencies que fazem o par de trade
 */
export async function periodicSummary(durationTime:number, currencies: [SC, SC]) {
	/**
	 * Qtdade de documentos daquela duração que será usado para fazer o resumo.
	 * Ex: 10 documentos de 10 minutos nos últimos 10 minutos
	 */
	const batchSize = (durationTime / changeTime) - 1

	// Pega o doc mais recente daquela duração e currency
	const doc = await PriceHistory.findOne({ duration: durationTime, currencies }).sort({ $natural: -1 })

	/**
	 * Momento que do primeiro documento daquele resumo, tipo 00:10. Se o doc
	 * existe, ele irá começar no próximo "ciclo", tipo 00:20. Se ele não existe,
	 * ele pega o primeiro documento de 1 minuto, ou seja, começa a fazer do
	 * zero
	 */
	let startTime = doc
		? doc.startTime + durationTime
		: (await PriceHistory.findOne({ duration: changeTime, currencies }))?.startTime

	// False se não existe nenhum doc de preço no sistema
	if (!startTime) return

	for (
		/**
		 * garantindo que o tempo inicial seja no começo redondo 00:00, 00:10 por
		 * exemplo. Se a hora for, 00:04, os 4 minutos serão subtraídos do startTime.
		 * Vale para qualquer valor do durationTime, de acordo com o @gabr1gus
		 */
		startTime = startTime - (startTime % durationTime);
		startTime < Date.now();
		startTime += durationTime
	) {
		// N está deletando os docs antigos
		const docs = await PriceHistory.find({
			startTime:{
				$gte : startTime,
				$lt : startTime + durationTime
			},
			currencies,
			duration: changeTime
		}).limit(batchSize)

		if (docs.length == 0) {
			continue
		}

		await new PriceHistory({
			open: docs[0].open,
			cose: docs[docs.length - 1].close,
			high: Math.max(...docs.map(item => item.high )),
			low: Math.min(...docs.map(item => item.low )),
			startTime,
			duration: durationTime,
			currencies
		}).save()
	}
}
