import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import type { MarketDepth } from '../../../interfaces/market'

const { subscribe, update, set } = writable<MarketDepth[]>([])

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/* setInterval(() => {
	update(v => [...v, v[v.length - 1]])
}, 1000) */

/** Pega os dados do grafico e popula a store */
export async function fetch(base:string, target:string) {
	try {
		if (!base || !target) return
		const { data } = await axios.get('/v1/market/orderbook/depth', {
			params: { base, target }
		})
		set(data)
	} catch (err) {
		console.error('Error fetching orders', err)
	}
}

/** Atualiza o array da store ao receber o evento depth_update */
addSocketListener('depth_update', (depth:MarketDepth) => {
	update(columns => {
		const index = columns.findIndex(v => v.type === depth.type && v.price > depth.price)
		return columns.splice(index, 0, depth)
	})
})

set([
	{
		'type': 'buy',
		'price': 9650.00000003,
		'volume': 0.46945262,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9650.00000002,
		'volume': 0.11899394,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9650.00000001,
		'volume': 0.12583032,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9650,
		'volume': 1.06356341,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9645,
		'volume': 0.05,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9642,
		'volume': 0.5172682,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9641.52579312,
		'volume': 0.09827004,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9641,
		'volume': 0.00211599,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9640.34982665,
		'volume': 0.01092612,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9635.83600002,
		'volume': 0.86490255,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9633.32,
		'volume': 0.00132721,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9631.8602055,
		'volume': 0.00061276,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9606.75400002,
		'volume': 0.0012631,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9600.00000001,
		'volume': 0.18446083,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9600,
		'volume': 1.24123758,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9597.1757024,
		'volume': 0.16280936,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9595,
		'volume': 0.04,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9592.14528508,
		'volume': 0.0097,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9592.0989599,
		'volume': 0.01231555,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9590,
		'volume': 0.00244612,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9584.24220002,
		'volume': 0.00061276,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9583.41037675,
		'volume': 0.00091674,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9580,
		'volume': 0.50499739,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9577.7777,
		'volume': 0.05,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9577.67200002,
		'volume': 0.0012631,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9570,
		'volume': 0.01096487,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9563.64067771,
		'volume': 3,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9563.6406777,
		'volume': 0.22923359,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9563.64067768,
		'volume': 0.15301744,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9559,
		'volume': 0.2,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9555,
		'volume': 0.1,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9550.00000003,
		'volume': 0.005202,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9550.00000001,
		'volume': 0.10538157,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9548.59000002,
		'volume': 0.0012631,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9547.59360701,
		'volume': 0.04759065,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9543.84809315,
		'volume': 0.01388168,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9541.1,
		'volume': 0.1,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9536.62,
		'volume': 0.00145618,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9534.960548,
		'volume': 0.00137157,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9533.314,
		'volume': 0.00944771,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9530.89591763,
		'volume': 0.00034859,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9525.2,
		'volume': 0.3,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9519.50800002,
		'volume': 0.0012631,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9510,
		'volume': 0.26393544,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9509.00000032,
		'volume': 0.32007665,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9500.98991003,
		'volume': 0.078,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9500.10101101,
		'volume': 0.00410454,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9500.1,
		'volume': 0.03286508,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9500.0005,
		'volume': 0.1,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'buy',
		'price': 9500.00000005,
		'volume': 0.05281407,
		currencies: ['bitcoin', 'nano']
	},
	{
		'type': 'sell',
		'price': 9651,
		'volume': 0,
		currencies: ['bitcoin', 'nano']
	},
	{
		'type': 'sell',
		'price': 9651.00000003,
		'volume': 0.08545011,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9651.95399999,
		'volume': 0.03086992,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9652.95399999,
		'volume': 0.74820391,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9655,
		'volume': 0.40400592,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9682,
		'volume': 0.01343342,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9697.99999998,
		'volume': 0.08350378,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9698,
		'volume': 0.124566,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9699,
		'volume': 0.19876424,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9699.00000009,
		'volume': 0.005,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9700,
		'volume': 0.50872607,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9700.64999999,
		'volume': 0.01773278,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9700.65000002,
		'volume': 0.01201113,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9710,
		'volume': 0.00218313,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9719.99999999,
		'volume': 1.765,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9720,
		'volume': 0.57894413,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9720.65,
		'volume': 0.02377453,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9723.65,
		'volume': 0.03580527,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9725.86365453,
		'volume': 0.47023552,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9725.86365454,
		'volume': 0.00097155,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9729,
		'volume': 0.54094875,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9729.00000009,
		'volume': 0.0939809,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9730,
		'volume': 0.19532376,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9731,
		'volume': 4.60383498,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9732.48331974,
		'volume': 0.16012455,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9733.11227424,
		'volume': 0.30930419,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9735,
		'volume': 0.03705053,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9738.64499995,
		'volume': 0.00261986,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9739.7049745,
		'volume': 0.00089253,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9740,
		'volume': 0.11427991,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9742,
		'volume': 0.00103934,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9747,
		'volume': 0.04364144,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9748.00991003,
		'volume': 0.00033182,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9748.26750002,
		'volume': 0.002,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9749,
		'volume': 0.96494173,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9749.85766765,
		'volume': 0.01087,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9749.999,
		'volume': 1.32297468,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9750.51000001,
		'volume': 0.00070435,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9752,
		'volume': 0.1,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9754,
		'volume': 0.19382349,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9755,
		'volume': 0.01568485,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9755.04,
		'volume': 0.08751113,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9760.4238481,
		'volume': 0.00073747,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9762.38978634,
		'volume': 0.02066872,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9763.98340952,
		'volume': 0.00125984,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9764.28584105,
		'volume': 0.15,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9765,
		'volume': 0.04167244,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9773,
		'volume': 0.005,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9774.1,
		'volume': 0.34258955,
		currencies: ['bitcoin', 'nano']
	}, {
		'type': 'sell',
		'price': 9776.2186,
		'volume': 0.10597,
		currencies: ['bitcoin', 'nano']
	}
]as MarketDepth[])
