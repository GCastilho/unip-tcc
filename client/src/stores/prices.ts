import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import type { PriceHistory } from '../../../interfaces/market'

const { subscribe, update, set } = writable<PriceHistory[]>([])

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies:string[]) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get('/v1/market/candle', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log(data)
		data.push(data[0])
		set(data)
	} catch (err) {
		console.error('Error fetching prices', err)
	}
}

/** Atualiza o array da store ao receber o evento depth_update */
/*addSocketListener('price_update', (price:PriceHistory) => {
	console.log(price)
	update(columns => {
		columns.push(price)
		return columns
	})
})
*/
set([
	{
		'startTime': new Date('2017-12-01').getTime(),
		'open': 7326.700195,
		'high': 7355.399902,
		'low': 7288.700195,
		'close': 7300.5,
		'adj close': 7300.5,
		'volume': 839825500
	},
	{
		'startTime': new Date('2017-12-04').getTime(),
		'open': 7300.5,
		'high': 7369.700195,
		'low': 7300.5,
		'close': 7339,
		'adj close': 7339,
		'volume': 745259400
	},
	{
		'startTime': new Date('2017-12-05').getTime(),
		'open': 7339,
		'high': 7373.899902,
		'low': 7326.600098,
		'close': 7327.5,
		'adj close': 7327.5,
		'volume': 881831300
	},
	{
		'startTime': new Date('2017-12-06').getTime(),
		'open': 7327.5,
		'high': 7369.700195,
		'low': 7289.399902,
		'close': 7348,
		'adj close': 7348,
		'volume': 672957500
	},
	{
		'startTime': new Date('2017-12-07').getTime(),
		'open': 7348,
		'high': 7371.700195,
		'low': 7314.600098,
		'close': 7320.799805,
		'adj close': 7320.799805,
		'volume': 803178700
	},
	{
		'startTime': new Date('2017-12-08').getTime(),
		'open': 7320.799805,
		'high': 7412.200195,
		'low': 7314.200195,
		'close': 7394,
		'adj close': 7394,
		'volume': 1004623500
	},
	{
		'startTime': new Date('2017-12-11').getTime(),
		'open': 7394,
		'high': 7458.399902,
		'low': 7393.600098,
		'close': 7453.5,
		'adj close': 7453.5,
		'volume': 906705100
	},
	{
		'startTime': new Date('2017-12-12').getTime(),
		'open': 7453.5,
		'high': 7501.5,
		'low': 7448.299805,
		'close': 7500.399902,
		'adj close': 7500.399902,
		'volume': 991599100
	},
	{
		'startTime': new Date('2017-12-13').getTime(),
		'open': 7500.399902,
		'high': 7510.799805,
		'low': 7492.600098,
		'close': 7496.5,
		'adj close': 7496.5,
		'volume': 998682800
	},
	{
		'startTime': new Date('2017-12-14').getTime(),
		'open': 7496.5,
		'high': 7496.700195,
		'low': 7448.100098,
		'close': 7448.100098,
		'adj close': 7448.100098,
		'volume': 948434600
	},
	{
		'startTime': new Date('2017-12-15').getTime(),
		'open': 7448.100098,
		'high': 7490.600098,
		'low': 7433.799805,
		'close': 7490.600098,
		'adj close': 7490.600098,
		'volume': 1182118000
	},
	{
		'startTime': new Date('2017-12-18').getTime(),
		'open': 7490.600098,
		'high': 7544.299805,
		'low': 7490.600098,
		'close': 7537,
		'adj close': 7537,
		'volume': 568259400
	},
	{
		'startTime': new Date('2017-12-19').getTime(),
		'open': 7537,
		'high': 7563.5,
		'low': 7534.100098,
		'close': 7544.100098,
		'adj close': 7544.100098,
		'volume': 675779500
	},
	{
		'startTime': new Date('2017-12-20').getTime(),
		'open': 7544.100098,
		'high': 7550.600098,
		'low': 7511.5,
		'close': 7525.200195,
		'adj close': 7525.200195,
		'volume': 659315600
	},
	{
		'startTime': new Date('2017-12-21').getTime(),
		'open': 7525.200195,
		'high': 7609.700195,
		'low': 7517.899902,
		'close': 7604,
		'adj close': 7604,
		'volume': 621347000
	},
	{
		'startTime': new Date('2017-12-22').getTime(),
		'open': 7604,
		'high': 7614.399902,
		'low': 7585.5,
		'close': 7592.700195,
		'adj close': 7592.700195,
		'volume': 243831300
	},
	{
		'startTime': new Date('2017-12-27').getTime(),
		'open': 7592.700195,
		'high': 7632.700195,
		'low': 7586.399902,
		'close': 7620.700195,
		'adj close': 7620.700195,
		'volume': 458380900
	},
	{
		'startTime': new Date('2017-12-28').getTime(),
		'open': 7620.700195,
		'high': 7633.600098,
		'low': 7609.799805,
		'close': 7622.899902,
		'adj close': 7622.899902,
		'volume': 311875400
	},
	{
		'startTime': new Date('2017-12-29').getTime(),
		'open': 7622.899902,
		'high': 7697.600098,
		'low': 7620,
		'close': 7687.799805,
		'adj close': 7687.799805,
		'volume': 289238900
	},
	{
		'startTime': new Date('2018-01-02').getTime(),
		'open': 7687.799805,
		'high': 7691.299805,
		'low': 7624.100098,
		'close': 7648.100098,
		'adj close': 7648.100098,
		'volume': 576251800
	},
	{
		'startTime': new Date('2018-01-03').getTime(),
		'open': 7648.100098,
		'high': 7689.899902,
		'low': 7640.5,
		'close': 7671.100098,
		'adj close': 7671.100098,
		'volume': 571662800
	},
	{
		'startTime': new Date('2018-01-04').getTime(),
		'open': 7671.100098,
		'high': 7702.5,
		'low': 7671.100098,
		'close': 7695.899902,
		'adj close': 7695.899902,
		'volume': 705864000
	},
	{
		'startTime': new Date('2018-01-05').getTime(),
		'open': 7695.899902,
		'high': 7727.700195,
		'low': 7689.799805,
		'close': 7724.200195,
		'adj close': 7724.200195,
		'volume': 636035700
	},
	{
		'startTime': new Date('2018-01-08').getTime(),
		'open': 7724.200195,
		'high': 7733.399902,
		'low': 7691.799805,
		'close': 7696.5,
		'adj close': 7696.5,
		'volume': 635135400
	},
	{
		'startTime': new Date('2018-01-09').getTime(),
		'open': 7696.5,
		'high': 7733.100098,
		'low': 7696.5,
		'close': 7731,
		'adj close': 7731,
		'volume': 709674500
	},
	{
		'startTime': new Date('2018-01-10').getTime(),
		'open': 7731,
		'high': 7756.100098,
		'low': 7716.200195,
		'close': 7748.5,
		'adj close': 7748.5,
		'volume': 861758600
	},
	{
		'startTime': new Date('2018-01-11').getTime(),
		'open': 7748.5,
		'high': 7769,
		'low': 7734.600098,
		'close': 7762.899902,
		'adj close': 7762.899902,
		'volume': 982791800
	},
	{
		'startTime': new Date('2018-01-12').getTime(),
		'open': 7762.899902,
		'high': 7792.600098,
		'low': 7752.600098,
		'close': 7778.600098,
		'adj close': 7778.600098,
		'volume': 1133867000
	},
	{
		'startTime': new Date('2018-01-15').getTime(),
		'open': 7778.600098,
		'high': 7783.600098,
		'low': 7763.399902,
		'close': 7769.100098,
		'adj close': 7769.100098,
		'volume': 551904700
	},
	{
		'startTime': new Date('2018-01-16').getTime(),
		'open': 7769.100098,
		'high': 7791.799805,
		'low': 7740.600098,
		'close': 7755.899902,
		'adj close': 7755.899902,
		'volume': 824367900
	},
	{
		'startTime': new Date('2018-01-17').getTime(),
		'open': 7755.899902,
		'high': 7755.899902,
		'low': 7711.100098,
		'close': 7725.399902,
		'adj close': 7725.399902,
		'volume': 822508200
	},
	{
		'startTime': new Date('2018-01-18').getTime(),
		'open': 7725.399902,
		'high': 7739.5,
		'low': 7683.700195,
		'close': 7701,
		'adj close': 7701,
		'volume': 765527900
	},
	{
		'startTime': new Date('2018-01-19').getTime(),
		'open': 7701,
		'high': 7731.799805,
		'low': 7694.700195,
		'close': 7730.799805,
		'adj close': 7730.799805,
		'volume': 795594100
	},
	{
		'startTime': new Date('2018-01-22').getTime(),
		'open': 7730.799805,
		'high': 7739.399902,
		'low': 7703.700195,
		'close': 7715.399902,
		'adj close': 7715.399902,
		'volume': 730171300
	},
	{
		'startTime': new Date('2018-01-23').getTime(),
		'open': 7715.399902,
		'high': 7745.200195,
		'low': 7710,
		'close': 7731.799805,
		'adj close': 7731.799805,
		'volume': 742420200
	},
	{
		'startTime': new Date('2018-01-24').getTime(),
		'open': 7731.799805,
		'high': 7732,
		'low': 7643.399902,
		'close': 7643.399902,
		'adj close': 7643.399902,
		'volume': 746643300
	},
	{
		'startTime': new Date('2018-01-25').getTime(),
		'open': 7643.399902,
		'high': 7662.399902,
		'low': 7608.5,
		'close': 7615.799805,
		'adj close': 7615.799805,
		'volume': 713251600
	},
	{
		'startTime': new Date('2018-01-26').getTime(),
		'open': 7615.799805,
		'high': 7667.399902,
		'low': 7615.799805,
		'close': 7665.5,
		'adj close': 7665.5,
		'volume': 713831300
	},
	{
		'startTime': new Date('2018-01-29').getTime(),
		'open': 7665.5,
		'high': 7689.200195,
		'low': 7663.899902,
		'close': 7671.5,
		'adj close': 7671.5,
		'volume': 612924000
	},
	{
		'startTime': new Date('2018-01-30').getTime(),
		'open': 7671.5,
		'high': 7671.700195,
		'low': 7587.100098,
		'close': 7588,
		'adj close': 7588,
		'volume': 798999000
	},
	{
		'startTime': new Date('2018-01-31').getTime(),
		'open': 7588,
		'high': 7599,
		'low': 7521.799805,
		'close': 7533.600098,
		'adj close': 7533.600098,
		'volume': 880751700
	},
	{
		'startTime': new Date('2018-02-01').getTime(),
		'open': 7533.600098,
		'high': 7554.700195,
		'low': 7476.5,
		'close': 7490.399902,
		'adj close': 7490.399902,
		'volume': 872509100
	},
	{
		'startTime': new Date('2018-02-02').getTime(),
		'open': 7490.399902,
		'high': 7494.799805,
		'low': 7432.299805,
		'close': 7443.399902,
		'adj close': 7443.399902,
		'volume': 871574000
	},
	{
		'startTime': new Date('2018-02-05').getTime(),
		'open': 7443.399902,
		'high': 7443.399902,
		'low': 7334.799805,
		'close': 7335,
		'adj close': 7335,
		'volume': 888994600
	},
	{
		'startTime': new Date('2018-02-06').getTime(),
		'open': 7335,
		'high': 7335,
		'low': 7079.399902,
		'close': 7141.399902,
		'adj close': 7141.399902,
		'volume': 1354591000
	},
	{
		'startTime': new Date('2018-02-07').getTime(),
		'open': 7141.399902,
		'high': 7311.5,
		'low': 7141.399902,
		'close': 7279.399902,
		'adj close': 7279.399902,
		'volume': 1027400300
	},
	{
		'startTime': new Date('2018-02-08').getTime(),
		'open': 7279.399902,
		'high': 7279.399902,
		'low': 7161.299805,
		'close': 7170.700195,
		'adj close': 7170.700195,
		'volume': 973611300
	},
	{
		'startTime': new Date('2018-02-09').getTime(),
		'open': 7170.700195,
		'high': 7170.700195,
		'low': 7073,
		'close': 7092.399902,
		'adj close': 7092.399902,
		'volume': 927291900
	},
	{
		'startTime': new Date('2018-02-12').getTime(),
		'open': 7092.399902,
		'high': 7199.899902,
		'low': 7092.399902,
		'close': 7177.100098,
		'adj close': 7177.100098,
		'volume': 718740600
	},
	{
		'startTime': new Date('2018-02-13').getTime(),
		'open': 7177.100098,
		'high': 7203,
		'low': 7165.799805,
		'close': 7168,
		'adj close': 7168,
		'volume': 718988800
	},
	{
		'startTime': new Date('2018-02-14').getTime(),
		'open': 7168,
		'high': 7243.200195,
		'low': 7145.700195,
		'close': 7214,
		'adj close': 7214,
		'volume': 940537000
	},
	{
		'startTime': new Date('2018-02-15').getTime(),
		'open': 7214,
		'high': 7268,
		'low': 7206.700195,
		'close': 7234.799805,
		'adj close': 7234.799805,
		'volume': 747830200
	},
	{
		'startTime': new Date('2018-02-16').getTime(),
		'open': 7234.799805,
		'high': 7308,
		'low': 7234.799805,
		'close': 7294.700195,
		'adj close': 7294.700195,
		'volume': 651756200
	},
	{
		'startTime': new Date('2018-02-19').getTime(),
		'open': 7294.700195,
		'high': 7306.200195,
		'low': 7240,
		'close': 7247.700195,
		'adj close': 7247.700195,
		'volume': 511199000
	},
	{
		'startTime': new Date('2018-02-20').getTime(),
		'open': 7247.700195,
		'high': 7264.799805,
		'low': 7202.100098,
		'close': 7246.799805,
		'adj close': 7246.799805,
		'volume': 679057900
	},
	{
		'startTime': new Date('2018-02-21').getTime(),
		'open': 7246.799805,
		'high': 7291.799805,
		'low': 7220.600098,
		'close': 7281.600098,
		'adj close': 7281.600098,
		'volume': 902872700
	},
	{
		'startTime': new Date('2018-02-22').getTime(),
		'open': 7281.600098,
		'high': 7281.600098,
		'low': 7187.799805,
		'close': 7252.399902,
		'adj close': 7252.399902,
		'volume': 926221400
	},
	{
		'startTime': new Date('2018-02-23').getTime(),
		'open': 7252.399902,
		'high': 7262.100098,
		'low': 7220.799805,
		'close': 7244.399902,
		'adj close': 7244.399902,
		'volume': 674864300
	},
	{
		'startTime': new Date('2018-02-26').getTime(),
		'open': 7244.399902,
		'high': 7313,
		'low': 7244.299805,
		'close': 7289.600098,
		'adj close': 7289.600098,
		'volume': 585774600
	},
	{
		'startTime': new Date('2018-02-27').getTime(),
		'open': 7289.600098,
		'high': 7326,
		'low': 7272.899902,
		'close': 7282.5,
		'adj close': 7282.5,
		'volume': 718147000
	},
	{
		'startTime': new Date('2018-02-28').getTime(),
		'open': 7282.5,
		'high': 7293.399902,
		'low': 7231.899902,
		'close': 7231.899902,
		'adj close': 7231.899902,
		'volume': 919954800
	},
	{
		'startTime': new Date('2018-03-01').getTime(),
		'open': 7231.899902,
		'high': 7231.899902,
		'low': 7153.399902,
		'close': 7175.600098,
		'adj close': 7175.600098,
		'volume': 859756500
	},
	{
		'startTime': new Date('2018-03-02').getTime(),
		'open': 7175.600098,
		'high': 7175.600098,
		'low': 7063.399902,
		'close': 7069.899902,
		'adj close': 7069.899902,
		'volume': 910442200
	},
	{
		'startTime': new Date('2018-03-05').getTime(),
		'open': 7069.899902,
		'high': 7119.200195,
		'low': 7062.100098,
		'close': 7116,
		'adj close': 7116,
		'volume': 941867700
	},
	{
		'startTime': new Date('2018-03-06').getTime(),
		'open': 7116,
		'high': 7197.799805,
		'low': 7115.600098,
		'close': 7146.799805,
		'adj close': 7146.799805,
		'volume': 786141900
	},
	{
		'startTime': new Date('2018-03-07').getTime(),
		'open': 7146.799805,
		'high': 7180.700195,
		'low': 7109.600098,
		'close': 7157.799805,
		'adj close': 7157.799805,
		'volume': 862383600
	},
	{
		'startTime': new Date('2018-03-08').getTime(),
		'open': 7157.799805,
		'high': 7212.100098,
		'low': 7145.700195,
		'close': 7203.200195,
		'adj close': 7203.200195,
		'volume': 712676800
	},
	{
		'startTime': new Date('2018-03-09').getTime(),
		'open': 7203.200195,
		'high': 7225.299805,
		'low': 7189.700195,
		'close': 7224.5,
		'adj close': 7224.5,
		'volume': 651119000
	},
	{
		'startTime': new Date('2018-03-12').getTime(),
		'open': 7224.5,
		'high': 7254.899902,
		'low': 7198.200195,
		'close': 7214.799805,
		'adj close': 7214.799805,
		'volume': 613077900
	},
	{
		'startTime': new Date('2018-03-13').getTime(),
		'open': 7214.799805,
		'high': 7224.100098,
		'low': 7125.600098,
		'close': 7138.799805,
		'adj close': 7138.799805,
		'volume': 766738500
	},
	{
		'startTime': new Date('2018-03-14').getTime(),
		'open': 7138.799805,
		'high': 7176.5,
		'low': 7122.799805,
		'close': 7132.700195,
		'adj close': 7132.700195,
		'volume': 752181500
	},
	{
		'startTime': new Date('2018-03-15').getTime(),
		'open': 7132.700195,
		'high': 7162.600098,
		'low': 7127.100098,
		'close': 7139.799805,
		'adj close': 7139.799805,
		'volume': 808062300
	},
	{
		'startTime': new Date('2018-03-16').getTime(),
		'open': 7139.799805,
		'high': 7187.299805,
		'low': 7131.299805,
		'close': 7164.100098,
		'adj close': 7164.100098,
		'volume': 1380663300
	},
	{
		'startTime': new Date('2018-03-19').getTime(),
		'open': 7164.100098,
		'high': 7164.200195,
		'low': 7034.899902,
		'close': 7042.899902,
		'adj close': 7042.899902,
		'volume': 728214400
	},
	{
		'startTime': new Date('2018-03-20').getTime(),
		'open': 7042.899902,
		'high': 7081.5,
		'low': 7042.600098,
		'close': 7061.299805,
		'adj close': 7061.299805,
		'volume': 742142200
	},
	{
		'startTime': new Date('2018-03-21').getTime(),
		'open': 7061.299805,
		'high': 7065.700195,
		'low': 7016.799805,
		'close': 7039,
		'adj close': 7039,
		'volume': 762202300
	},
	{
		'startTime': new Date('2018-03-22').getTime(),
		'open': 7039,
		'high': 7039,
		'low': 6914.5,
		'close': 6952.600098,
		'adj close': 6952.600098,
		'volume': 861231600
	},
	{
		'startTime': new Date('2018-03-23').getTime(),
		'open': 6952.600098,
		'high': 6952.799805,
		'low': 6877,
		'close': 6921.899902,
		'adj close': 6921.899902,
		'volume': 879273700
	},
	{
		'startTime': new Date('2018-03-26').getTime(),
		'open': 6921.899902,
		'high': 6958.5,
		'low': 6866.899902,
		'close': 6888.700195,
		'adj close': 6888.700195,
		'volume': 765318100
	},
	{
		'startTime': new Date('2018-03-27').getTime(),
		'open': 6888.700195,
		'high': 7042.399902,
		'low': 6888.700195,
		'close': 7000.100098,
		'adj close': 7000.100098,
		'volume': 690975500
	},
	{
		'startTime': new Date('2018-03-28').getTime(),
		'open': 7000.100098,
		'high': 7044.700195,
		'low': 6923.299805,
		'close': 7044.700195,
		'adj close': 7044.700195,
		'volume': 763193100
	},
	{
		'startTime': new Date('2018-03-29').getTime(),
		'open': 7044.700195,
		'high': 7109.899902,
		'low': 7042.700195,
		'close': 7056.600098,
		'adj close': 7056.600098,
		'volume': 876227900
	},
	{
		'startTime': new Date('2018-04-03').getTime(),
		'open': 7056.600098,
		'high': 7065,
		'low': 6996.799805,
		'close': 7030.5,
		'adj close': 7030.5,
		'volume': 790532700
	},
	{
		'startTime': new Date('2018-04-04').getTime(),
		'open': 7030.5,
		'high': 7046.299805,
		'low': 6971.799805,
		'close': 7034,
		'adj close': 7034,
		'volume': 794337900
	},
	{
		'startTime': new Date('2018-04-05').getTime(),
		'open': 7034,
		'high': 7199.5,
		'low': 7034,
		'close': 7199.5,
		'adj close': 7199.5,
		'volume': 794899100
	},
	{
		'startTime': new Date('2018-04-06').getTime(),
		'open': 7199.5,
		'high': 7214,
		'low': 7163.100098,
		'close': 7183.600098,
		'adj close': 7183.600098,
		'volume': 656250500
	},
	{
		'startTime': new Date('2018-04-09').getTime(),
		'open': 7183.600098,
		'high': 7209.700195,
		'low': 7145.600098,
		'close': 7194.799805,
		'adj close': 7194.799805,
		'volume': 671088200
	},
	{
		'startTime': new Date('2018-04-10').getTime(),
		'open': 7194.799805,
		'high': 7266.799805,
		'low': 7194.799805,
		'close': 7266.799805,
		'adj close': 7266.799805,
		'volume': 755081700
	},
	{
		'startTime': new Date('2018-04-11').getTime(),
		'open': 7266.799805,
		'high': 7270.299805,
		'low': 7243.299805,
		'close': 7257.100098,
		'adj close': 7257.100098,
		'volume': 766200800
	},
	{
		'startTime': new Date('2018-04-12').getTime(),
		'open': 7257.100098,
		'high': 7266.600098,
		'low': 7240.799805,
		'close': 7258.299805,
		'adj close': 7258.299805,
		'volume': 666773400
	},
	{
		'startTime': new Date('2018-04-13').getTime(),
		'open': 7258.299805,
		'high': 7275,
		'low': 7249.100098,
		'close': 7264.600098,
		'adj close': 7264.600098,
		'volume': 662868400
	},
	{
		'startTime': new Date('2018-04-16').getTime(),
		'open': 7264.600098,
		'high': 7265.799805,
		'low': 7195.5,
		'close': 7198.200195,
		'adj close': 7198.200195,
		'volume': 862881700
	},
	{
		'startTime': new Date('2018-04-17').getTime(),
		'open': 7198.200195,
		'high': 7240.399902,
		'low': 7189.899902,
		'close': 7226.100098,
		'adj close': 7226.100098,
		'volume': 714046100
	},
	{
		'startTime': new Date('2018-04-18').getTime(),
		'open': 7226.100098,
		'high': 7325.600098,
		'low': 7226.100098,
		'close': 7317.299805,
		'adj close': 7317.299805,
		'volume': 877056200
	},
	{
		'startTime': new Date('2018-04-19').getTime(),
		'open': 7317.299805,
		'high': 7340.700195,
		'low': 7309.399902,
		'close': 7328.899902,
		'adj close': 7328.899902,
		'volume': 788416300
	},
	{
		'startTime': new Date('2018-04-20').getTime(),
		'open': 7328.899902,
		'high': 7368.200195,
		'low': 7323.299805,
		'close': 7368.200195,
		'adj close': 7368.200195,
		'volume': 769512800
	},
	{
		'startTime': new Date('2018-04-23').getTime(),
		'open': 7368.200195,
		'high': 7404.100098,
		'low': 7359.700195,
		'close': 7398.899902,
		'adj close': 7398.899902,
		'volume': 777571800
	},
	{
		'startTime': new Date('2018-04-24').getTime(),
		'open': 7398.899902,
		'high': 7439.600098,
		'low': 7397.299805,
		'close': 7425.399902,
		'adj close': 7425.399902,
		'volume': 836399400
	},
	{
		'startTime': new Date('2018-04-25').getTime(),
		'open': 7425.399902,
		'high': 7427.100098,
		'low': 7334.600098,
		'close': 7379.299805,
		'adj close': 7379.299805,
		'volume': 879795200
	},
	{
		'startTime': new Date('2018-04-26').getTime(),
		'open': 7379.299805,
		'high': 7421.399902,
		'low': 7355,
		'close': 7421.399902,
		'adj close': 7421.399902,
		'volume': 814899700
	},
	{
		'startTime': new Date('2018-04-27').getTime(),
		'open': 7421.399902,
		'high': 7507.100098,
		'low': 7421.299805,
		'close': 7502.200195,
		'adj close': 7502.200195,
		'volume': 750485000
	},
	{
		'startTime': new Date('2018-04-30').getTime(),
		'open': 7502.200195,
		'high': 7546.200195,
		'low': 7497.100098,
		'close': 7509.299805,
		'adj close': 7509.299805,
		'volume': 991178200
	},
	{
		'startTime': new Date('2018-05-01').getTime(),
		'open': 7509.299805,
		'high': 7549.100098,
		'low': 7506.600098,
		'close': 7520.399902,
		'adj close': 7520.399902,
		'volume': 567569600
	},
	{
		'startTime': new Date('2018-05-02').getTime(),
		'open': 7520.399902,
		'high': 7573,
		'low': 7519.600098,
		'close': 7543.200195,
		'adj close': 7543.200195,
		'volume': 829699300
	},
	{
		'startTime': new Date('2018-05-03').getTime(),
		'open': 7543.200195,
		'high': 7555.200195,
		'low': 7492.399902,
		'close': 7502.700195,
		'adj close': 7502.700195,
		'volume': 723643100
	},
	{
		'startTime': new Date('2018-05-04').getTime(),
		'open': 7502.700195,
		'high': 7570.200195,
		'low': 7502.700195,
		'close': 7567.100098,
		'adj close': 7567.100098,
		'volume': 880646600
	},
	{
		'startTime': new Date('2018-05-08').getTime(),
		'open': 7567.100098,
		'high': 7598.5,
		'low': 7550.399902,
		'close': 7565.799805,
		'adj close': 7565.799805,
		'volume': 876829900
	},
	{
		'startTime': new Date('2018-05-09').getTime(),
		'open': 7565.799805,
		'high': 7662.5,
		'low': 7565.799805,
		'close': 7662.5,
		'adj close': 7662.5,
		'volume': 891351200
	},
	{
		'startTime': new Date('2018-05-10').getTime(),
		'open': 7662.5,
		'high': 7706.899902,
		'low': 7631.600098,
		'close': 7701,
		'adj close': 7701,
		'volume': 878774100
	},
	{
		'startTime': new Date('2018-05-11').getTime(),
		'open': 7701,
		'high': 7728.899902,
		'low': 7691.700195,
		'close': 7724.600098,
		'adj close': 7724.600098,
		'volume': 731924200
	},
	{
		'startTime': new Date('2018-05-14').getTime(),
		'open': 7724.600098,
		'high': 7728,
		'low': 7688.600098,
		'close': 7711,
		'adj close': 7711,
		'volume': 749899600
	},
	{
		'startTime': new Date('2018-05-15').getTime(),
		'open': 7711,
		'high': 7752,
		'low': 7687.5,
		'close': 7723,
		'adj close': 7723,
		'volume': 1027698700
	},
	{
		'startTime': new Date('2018-05-16').getTime(),
		'open': 7723,
		'high': 7745.5,
		'low': 7717.799805,
		'close': 7734.200195,
		'adj close': 7734.200195,
		'volume': 933498300
	},
	{
		'startTime': new Date('2018-05-17').getTime(),
		'open': 7734.200195,
		'high': 7788.200195,
		'low': 7713.899902,
		'close': 7788,
		'adj close': 7788,
		'volume': 781296600
	},
	{
		'startTime': new Date('2018-05-18').getTime(),
		'open': 7788,
		'high': 7791.399902,
		'low': 7753.299805,
		'close': 7778.799805,
		'adj close': 7778.799805,
		'volume': 899946200
	},
	{
		'startTime': new Date('2018-05-21').getTime(),
		'open': 7778.799805,
		'high': 7868.100098,
		'low': 7778.100098,
		'close': 7859.200195,
		'adj close': 7859.200195,
		'volume': 691927400
	},
	{
		'startTime': new Date('2018-05-22').getTime(),
		'open': 7859.200195,
		'high': 7903.5,
		'low': 7854.600098,
		'close': 7877.5,
		'adj close': 7877.5,
		'volume': 807636300
	},
	{
		'startTime': new Date('2018-05-23').getTime(),
		'open': 7877.5,
		'high': 7877.5,
		'low': 7765.299805,
		'close': 7788.399902,
		'adj close': 7788.399902,
		'volume': 918822700
	},
	{
		'startTime': new Date('2018-05-24').getTime(),
		'open': 7788.399902,
		'high': 7803.5,
		'low': 7716.700195,
		'close': 7716.700195,
		'adj close': 7716.700195,
		'volume': 890463600
	},
	{
		'startTime': new Date('2018-05-25').getTime(),
		'open': 7716.700195,
		'high': 7753.299805,
		'low': 7703.299805,
		'close': 7730.299805,
		'adj close': 7730.299805,
		'volume': 844360200
	},
	{
		'startTime': new Date('2018-05-29').getTime(),
		'open': 7730.299805,
		'high': 7730.299805,
		'low': 7610.700195,
		'close': 7632.600098,
		'adj close': 7632.600098,
		'volume': 1288493000
	},
	{
		'startTime': new Date('2018-05-30').getTime(),
		'open': 7632.600098,
		'high': 7689.600098,
		'low': 7618.100098,
		'close': 7689.600098,
		'adj close': 7689.600098,
		'volume': 923820700
	},
	{
		'startTime': new Date('2018-05-31').getTime(),
		'open': 7689.600098,
		'high': 7727.5,
		'low': 7651.100098,
		'close': 7678.200195,
		'adj close': 7678.200195,
		'volume': 1549063100
	},
	{
		'startTime': new Date('2018-06-01').getTime(),
		'open': 7678.200195,
		'high': 7746.700195,
		'low': 7678.200195,
		'close': 7701.799805,
		'adj close': 7701.799805,
		'volume': 783469400
	},
	{
		'startTime': new Date('2018-06-04').getTime(),
		'open': 7701.799805,
		'high': 7772.100098,
		'low': 7701.700195,
		'close': 7741.299805,
		'adj close': 7741.299805,
		'volume': 722966000
	},
	{
		'startTime': new Date('2018-06-05').getTime(),
		'open': 7741.299805,
		'high': 7744.5,
		'low': 7686.600098,
		'close': 7686.799805,
		'adj close': 7686.799805,
		'volume': 933666200
	},
	{
		'startTime': new Date('2018-06-06').getTime(),
		'open': 7686.799805,
		'high': 7730.5,
		'low': 7671.600098,
		'close': 7712.399902,
		'adj close': 7712.399902,
		'volume': 884617800
	},
	{
		'startTime': new Date('2018-06-07').getTime(),
		'open': 7712.399902,
		'high': 7756.700195,
		'low': 7698.200195,
		'close': 7704.399902,
		'adj close': 7704.399902,
		'volume': 1056744900
	},
	{
		'startTime': new Date('2018-06-08').getTime(),
		'open': 7704.399902,
		'high': 7714.299805,
		'low': 7637.5,
		'close': 7681.100098,
		'adj close': 7681.100098,
		'volume': 755489900
	},
	{
		'startTime': new Date('2018-06-11').getTime(),
		'open': 7681.100098,
		'high': 7756,
		'low': 7681.100098,
		'close': 7737.399902,
		'adj close': 7737.399902,
		'volume': 736070400
	},
	{
		'startTime': new Date('2018-06-12').getTime(),
		'open': 7737.399902,
		'high': 7762.799805,
		'low': 7701.299805,
		'close': 7703.799805,
		'adj close': 7703.799805,
		'volume': 773837800
	},
	{
		'startTime': new Date('2018-06-13').getTime(),
		'open': 7703.799805,
		'high': 7746.700195,
		'low': 7677.200195,
		'close': 7703.700195,
		'adj close': 7703.700195,
		'volume': 852427100
	},
	{
		'startTime': new Date('2018-06-14').getTime(),
		'open': 7703.700195,
		'high': 7793.5,
		'low': 7650.200195,
		'close': 7765.799805,
		'adj close': 7765.799805,
		'volume': 1119081700
	},
	{
		'startTime': new Date('2018-06-15').getTime(),
		'open': 7765.799805,
		'high': 7781,
		'low': 7633.899902,
		'close': 7633.899902,
		'adj close': 7633.899902,
		'volume': 1711560200
	},
	{
		'startTime': new Date('2018-06-18').getTime(),
		'open': 7633.899902,
		'high': 7645.5,
		'low': 7601.600098,
		'close': 7631.299805,
		'adj close': 7631.299805,
		'volume': 664167900
	},
	{
		'startTime': new Date('2018-06-19').getTime(),
		'open': 7631.299805,
		'high': 7631.299805,
		'low': 7548.799805,
		'close': 7603.899902,
		'adj close': 7603.899902,
		'volume': 897872000
	},
	{
		'startTime': new Date('2018-06-20').getTime(),
		'open': 7603.899902,
		'high': 7705.200195,
		'low': 7603.899902,
		'close': 7627.399902,
		'adj close': 7627.399902,
		'volume': 844000100
	},
	{
		'startTime': new Date('2018-06-21').getTime(),
		'open': 7627.399902,
		'high': 7670.799805,
		'low': 7548.100098,
		'close': 7556.399902,
		'adj close': 7556.399902,
		'volume': 777562300
	},
	{
		'startTime': new Date('2018-06-22').getTime(),
		'open': 7556.399902,
		'high': 7689.399902,
		'low': 7556.200195,
		'close': 7682.299805,
		'adj close': 7682.299805,
		'volume': 716273100
	},
	{
		'startTime': new Date('2018-06-25').getTime(),
		'open': 7682.299805,
		'high': 7682.299805,
		'low': 7508.299805,
		'close': 7509.799805,
		'adj close': 7509.799805,
		'volume': 791358000
	},
	{
		'startTime': new Date('2018-06-26').getTime(),
		'open': 7509.799805,
		'high': 7564.100098,
		'low': 7509.799805,
		'close': 7537.899902,
		'adj close': 7537.899902,
		'volume': 1088107300
	},
	{
		'startTime': new Date('2018-06-27').getTime(),
		'open': 7537.899902,
		'high': 7633.899902,
		'low': 7512,
		'close': 7621.700195,
		'adj close': 7621.700195,
		'volume': 1643638600
	},
	{
		'startTime': new Date('2018-06-28').getTime(),
		'open': 7621.700195,
		'high': 7632.200195,
		'low': 7576,
		'close': 7615.600098,
		'adj close': 7615.600098,
		'volume': 790762300
	},
	{
		'startTime': new Date('2018-06-29').getTime(),
		'open': 7615.600098,
		'high': 7706.600098,
		'low': 7615.600098,
		'close': 7636.899902,
		'adj close': 7636.899902,
		'volume': 898931000
	},
	{
		'startTime': new Date('2018-07-02').getTime(),
		'open': 7636.899902,
		'high': 7636.899902,
		'low': 7540.700195,
		'close': 7547.899902,
		'adj close': 7547.899902,
		'volume': 778437000
	},
	{
		'startTime': new Date('2018-07-03').getTime(),
		'open': 7547.899902,
		'high': 7632.100098,
		'low': 7545,
		'close': 7593.299805,
		'adj close': 7593.299805,
		'volume': 1015952400
	},
	{
		'startTime': new Date('2018-07-04').getTime(),
		'open': 7593.299805,
		'high': 7593.299805,
		'low': 7560.799805,
		'close': 7573.100098,
		'adj close': 7573.100098,
		'volume': 574163100
	},
	{
		'startTime': new Date('2018-07-05').getTime(),
		'open': 7573.100098,
		'high': 7624.799805,
		'low': 7572.700195,
		'close': 7603.200195,
		'adj close': 7603.200195,
		'volume': 614456600
	},
	{
		'startTime': new Date('2018-07-06').getTime(),
		'open': 7603.200195,
		'high': 7631.200195,
		'low': 7569.700195,
		'close': 7617.700195,
		'adj close': 7617.700195,
		'volume': 663475300
	},
	{
		'startTime': new Date('2018-07-09').getTime(),
		'open': 7617.700195,
		'high': 7697.5,
		'low': 7617.700195,
		'close': 7688,
		'adj close': 7688,
		'volume': 676761100
	},
	{
		'startTime': new Date('2018-07-10').getTime(),
		'open': 7688,
		'high': 7715.100098,
		'low': 7677.100098,
		'close': 7692,
		'adj close': 7692,
		'volume': 701511200
	},
	{
		'startTime': new Date('2018-07-11').getTime(),
		'open': 7692,
		'high': 7692,
		'low': 7578.200195,
		'close': 7592,
		'adj close': 7592,
		'volume': 793208100
	},
	{
		'startTime': new Date('2018-07-12').getTime(),
		'open': 7592,
		'high': 7663,
		'low': 7592,
		'close': 7651.299805,
		'adj close': 7651.299805,
		'volume': 746183900
	},
	{
		'startTime': new Date('2018-07-13').getTime(),
		'open': 7651.299805,
		'high': 7716.200195,
		'low': 7651.299805,
		'close': 7661.899902,
		'adj close': 7661.899902,
		'volume': 574401200
	},
	{
		'startTime': new Date('2018-07-16').getTime(),
		'open': 7661.899902,
		'high': 7667.700195,
		'low': 7565,
		'close': 7600.5,
		'adj close': 7600.5,
		'volume': 591161000
	},
	{
		'startTime': new Date('2018-07-17').getTime(),
		'open': 7600.5,
		'high': 7641.100098,
		'low': 7581.799805,
		'close': 7626.299805,
		'adj close': 7626.299805,
		'volume': 724367500
	},
	{
		'startTime': new Date('2018-07-18').getTime(),
		'open': 7626.299805,
		'high': 7685.700195,
		'low': 7625.799805,
		'close': 7676.299805,
		'adj close': 7676.299805,
		'volume': 651377100
	},
	{
		'startTime': new Date('2018-07-19').getTime(),
		'open': 7676.299805,
		'high': 7702.899902,
		'low': 7660,
		'close': 7684,
		'adj close': 7684,
		'volume': 695398600
	},
	{
		'startTime': new Date('2018-07-20').getTime(),
		'open': 7684,
		'high': 7705.799805,
		'low': 7631.700195,
		'close': 7678.799805,
		'adj close': 7678.799805,
		'volume': 685061200
	},
	{
		'startTime': new Date('2018-07-23').getTime(),
		'open': 7678.799805,
		'high': 7678.799805,
		'low': 7621.799805,
		'close': 7655.799805,
		'adj close': 7655.799805,
		'volume': 573514400
	},
	{
		'startTime': new Date('2018-07-24').getTime(),
		'open': 7655.790039,
		'high': 7740.640137,
		'low': 7648.589844,
		'close': 7709.049805,
		'adj close': 7709.049805,
		'volume': 0
	}
] as PriceHistory[])
