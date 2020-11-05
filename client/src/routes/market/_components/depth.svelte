<svelte:head>
	<link rel='stylesheet' href='depth.css'>
</svelte:head>

<script lang='ts'>
	import { onMount } from 'svelte'
	import * as d3 from 'd3'


	const bids = 
[
		{
		"side": "buy",
		"price": 9650.00000003,
		"amount": 0.46945262,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9650.00000002,
		"amount": 0.11899394,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9650.00000001,
		"amount": 0.12583032,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9650,
		"amount": 1.06356341,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9645,
		"amount": 0.05,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9642,
		"amount": 0.5172682,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9641.52579312,
		"amount": 0.09827004,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9641,
		"amount": 0.00211599,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9640.34982665,
		"amount": 0.01092612,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9635.83600002,
		"amount": 0.86490255,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9633.32,
		"amount": 0.00132721,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9631.8602055,
		"amount": 0.00061276,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9606.75400002,
		"amount": 0.0012631,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9600.00000001,
		"amount": 0.18446083,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9600,
		"amount": 1.24123758,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9597.1757024,
		"amount": 0.16280936,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9595,
		"amount": 0.04,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9592.14528508,
		"amount": 0.0097,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9592.0989599,
		"amount": 0.01231555,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9590,
		"amount": 0.00244612,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "buy",
		"price": 9584.24220002,
		"amount": 0.00061276,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9583.41037675,
		"amount": 0.00091674,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9580,
		"amount": 0.50499739,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9577.7777,
		"amount": 0.05,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9577.67200002,
		"amount": 0.0012631,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9570,
		"amount": 0.01096487,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9563.64067771,
		"amount": 3,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9563.6406777,
		"amount": 0.22923359,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9563.64067768,
		"amount": 0.15301744,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9559,
		"amount": 0.2,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9555,
		"amount": 0.1,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9550.00000003,
		"amount": 0.005202,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9550.00000001,
		"amount": 0.10538157,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9548.59000002,
		"amount": 0.0012631,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9547.59360701,
		"amount": 0.04759065,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9543.84809315,
		"amount": 0.01388168,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9541.1,
		"amount": 0.1,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9536.62,
		"amount": 0.00145618,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9534.960548,
		"amount": 0.00137157,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9533.314,
		"amount": 0.00944771,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9530.89591763,
		"amount": 0.00034859,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9525.2,
		"amount": 0.3,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9519.50800002,
		"amount": 0.0012631,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9510,
		"amount": 0.26393544,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9509.00000032,
		"amount": 0.32007665,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9500.98991003,
		"amount": 0.078,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9500.10101101,
		"amount": 0.00410454,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9500.1,
		"amount": 0.03286508,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9500.0005,
		"amount": 0.1,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "buy",
		"price": 9500.00000005,
		"amount": 0.05281407,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}
]
	const asks =
[
	{
		"side": "sell",
		"price": 9651,
		"amount": 0,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	},
		{
		"side": "sell",
		"price": 9651.00000003,
		"amount": 0.08545011,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9651.95399999,
		"amount": 0.03086992,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9652.95399999,
		"amount": 0.74820391,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9655,
		"amount": 0.40400592,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9682,
		"amount": 0.01343342,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9697.99999998,
		"amount": 0.08350378,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9698,
		"amount": 0.124566,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9699,
		"amount": 0.19876424,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9699.00000009,
		"amount": 0.005,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9700,
		"amount": 0.50872607,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9700.64999999,
		"amount": 0.01773278,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9700.65000002,
		"amount": 0.01201113,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9710,
		"amount": 0.00218313,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9719.99999999,
		"amount": 1.765,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9720,
		"amount": 0.57894413,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9720.65,
		"amount": 0.02377453,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9723.65,
		"amount": 0.03580527,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9725.86365453,
		"amount": 0.47023552,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9725.86365454,
		"amount": 0.00097155,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9729,
		"amount": 0.54094875,
		"timestamp": 1512117867566,
		"datetime": "Dec 5 2017, 01:44:27:566 AM"
	}, {
		"side": "sell",
		"price": 9729.00000009,
		"amount": 0.0939809,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9730,
		"amount": 0.19532376,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9731,
		"amount": 4.60383498,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9732.48331974,
		"amount": 0.16012455,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9733.11227424,
		"amount": 0.30930419,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9735,
		"amount": 0.03705053,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9738.64499995,
		"amount": 0.00261986,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9739.7049745,
		"amount": 0.00089253,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9740,
		"amount": 0.11427991,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9742,
		"amount": 0.00103934,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9747,
		"amount": 0.04364144,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9748.00991003,
		"amount": 0.00033182,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9748.26750002,
		"amount": 0.002,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9749,
		"amount": 0.96494173,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9749.85766765,
		"amount": 0.01087,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9749.999,
		"amount": 1.32297468,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9750.51000001,
		"amount": 0.00070435,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9752,
		"amount": 0.1,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9754,
		"amount": 0.19382349,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9755,
		"amount": 0.01568485,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9755.04,
		"amount": 0.08751113,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9760.4238481,
		"amount": 0.00073747,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9762.38978634,
		"amount": 0.02066872,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9763.98340952,
		"amount": 0.00125984,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9764.28584105,
		"amount": 0.15,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9765,
		"amount": 0.04167244,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9773,
		"amount": 0.005,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9774.1,
		"amount": 0.34258955,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}, {
		"side": "sell",
		"price": 9776.2186,
		"amount": 0.10597,
		"timestamp": 1512117867567,
		"datetime": "Dec 5 2017, 01:44:27:567 AM"
	}
]

	/** a largura real do grafico, visivel + invisivel */
	let virtualWidth: number
	const margin = {top: 15, right: 65, bottom: 205, left: 50}
	/** a largura visivel da porçao do grafico */
	const width = 1000 - margin.left - margin.right
	const height = 625 - margin.top - margin.bottom

	/** mapeia o posicionamento ordenado dos itens, referente a graduaçao Inferior (X) */
	let xScale : d3.ScaleLinear<number,number>
	/** mapeia o posicionamento ordenado dos itens, referente a graduaçao Lateral (Y) */
	let yScale : d3.ScaleLinear<number,number>

	let xBand : d3.ScaleBand<string>
	/** ordena os valores presentes na regua, referente a graduaçao Lateral (Y) */
	let xAxis : d3.Axis<d3.NumberValue>
	
	// algumas variaveis auxiliares que nao tem muita importancia
	let filtered: any[], minP: number, maxP: number, buffer : number

	/** objeto referente as definiçoes e comportamento de zoom */
	let zoom : d3.ZoomBehavior<Element, unknown>
	/** o timeout do zoom, impede que mutiplas transaçoes estejam ocorrendo */
	let resizeTimer : NodeJS.Timeout
	/** the current zoon scale */
	let zoomQuantity : number
	/** the current transform data */
	let transform : d3.ZoomTransform
	/** o tempo de druçao da transiçao do zoom */
	let transitionDuration = 800
	/** o tempo de espera antes do inicio da transiçao do zoom */
	let transitionStartTimeout = 50

	let data
	/** o corpo inteiro do grafico */
	let svg : d3.Selection<Element, unknown, any, any>
	/** o corpo das colunas do grafico */
	let depth : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala X e seus valores*/
	let gX : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala Y e as linhas */
	let gY : d3.Selection<SVGGElement, unknown, HTMLElement, any>

	let chartBody
	
	onMount(() => {
		drawChart()
	})

	function drawChart() {
		virtualWidth = width 
		svg = d3.select('#depthChart')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')

		data = prefixSum(bids).reverse()
		data.push(...prefixSum(asks))
		let xmax = Math.max(...data.map(v => v.price))

		xScale = d3.scaleLinear()
			.domain([ -1 , data.length])
			.range([0, virtualWidth])

		xBand = d3.scaleBand()
			.domain(d3.range(-1, data.length).map(v => v.toString()))
			.range([0, width]).padding(0.2)

		xAxis = d3.axisBottom(xScale)
		.tickFormat((d) => {
			return `${data[d.valueOf()]?.price}`
		})

		svg.append('rect')
			.attr('id','rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.attr('clip-path', 'url(#clip)')

		gX = svg.append('g')
			.attr('class', 'axis x-axis') // Assign 'axis' class
			.attr('transform', 'translate(0,' + height + ')')
			.call(xAxis)

		gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())

		const ymax = d3.max(data.map(r => r.amount)) || 100

		yScale = d3.scaleLinear().domain([0, ymax]).range([height, 0])
		
		gY = svg.append('g')
			.call(
				d3.axisLeft(yScale).tickFormat(d3.format("$~f")).tickValues(
					d3.scaleLinear().domain(yScale.domain()).ticks()
				)
			)
			.call(g => g.selectAll(".tick line")
				.clone()
				.attr("stroke-opacity", 0.2)
				.attr("x2", virtualWidth )
			)
		
		chartBody = svg.append('g')
			.attr('class', 'chartBody')
			.attr('clip-path', 'url(#clip)')

		depth = chartBody.selectAll('.depth')
			.data(data)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i))
			.attr('class', 'depth')
			.attr('price', d => d.price)
			.attr('amount', d => d.amount)
			.attr('y', d => yScale(d.amount))
			.attr('width', xBand.bandwidth())
			.attr('height', d => height*10 )
			.attr('fill', d => (d.side === 'sell') ? 'red' : 'green')
		
		svg.append('defs')
			.append('clipPath')
			.attr('id', 'clip')
			.append('rect')
			.attr('width', width)
			.attr('height', height)

		const extent: [[number, number], [number, number]] = [[0, 0], [width, height/2]]

		zoom = d3.zoom()
			.scaleExtent([1, 70])
			.translateExtent(extent)
			.extent(extent)
			.on('zoom', zoomed)
			.on('zoom.end', zoomend)
		svg.call(zoom)
		
		function zoomed(event: { transform: d3.ZoomTransform; }) {
			transform = event.transform
			zoomQuantity = transform.k
			let xScaleZ = transform.rescaleX(xScale)
			console.log(transform)
			const hideTicksWithoutLabel = function() {
				d3.selectAll('.xAxis .tick text').each(function(this: any){
					if (this.innerHTML === '') {
						this.parentNode.style.display = 'none'
					}
				})
			}

			gX.call(
				d3.axisBottom(xScale)
					.tickFormat((d) => {
				return `${data[d.valueOf()]?.price}`
				})
			)


			depth.attr('x', (d, i) => xScaleZ(i) - (xBand.bandwidth()*zoomQuantity)/2)
				.attr('width', xBand.bandwidth()*zoomQuantity)

			hideTicksWithoutLabel()

			gX.selectAll('.tick text')
				.call(wrap, xBand.bandwidth())
		}

		function zoomend(event) {

			const xPriceScale = d3.scaleQuantize()
				.domain([0, data.length])
				.range(data.map(d => d.price))

			let xScaleZ = transform.rescaleX(xScale)
			clearTimeout(resizeTimer)

			resizeTimer = setTimeout(function() {
				const xmin = xPriceScale(Math.floor(xScaleZ.domain()[0]))
				xmax = xPriceScale(Math.floor(xScaleZ.domain()[1]))
				filtered = data.filter(d => ((d.price >= xmin) && (d.price <= xmax)))
				minP = +d3.min(filtered, d => d['amount'])
				maxP = +d3.max(filtered, d => d['amount'])
				buffer = Math.floor((maxP - minP) * 0.1)
			
				yScale.domain([0, maxP + buffer])
				depth.transition()
					.duration(transitionDuration)
					.attr('y', d => yScale(d.amount))
					.attr('height', height*10)// gambiarra pra deixar bonito

				gY.transition().duration(transitionDuration)
					.call(d3.axisLeft(yScale)
						.tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
					)
					.call(g => g.selectAll(".tick line")
						.attr("stroke-opacity", 0.2)
						.attr("x2", virtualWidth )
					)

			}, transitionStartTimeout)
		}
	}



	function updateDepth (data) {
		if(!svg) return

		const extent: [[number, number], [number, number]] = [[0, 0], [width, height/2]] 
		zoom.translateExtent(extent)

		svg.call(zoom)
		//dates = prices.map(p => p.startTime)

		xScale=	d3.scaleLinear()
			.domain([ -1 , data.length])
			.range([0, virtualWidth])
		xBand = d3.scaleBand()
			.domain(d3.range(-1, data.length).map(v => v.toString()))
			.range([0, virtualWidth]).padding(0.2)
		let xScaleZ = transform.rescaleX(xScale)
	
		//redefine dominio da escala
		const xPriceScale = d3.scaleQuantize()
			.domain([0, data.length])
			.range(data.map(d => d.price))
	
		const xmin = xPriceScale(Math.floor(xScaleZ.domain()[0]))
		const xmax = xPriceScale(Math.floor(xScaleZ.domain()[1]))

		filtered = data.filter(d => ((d.startTime >= xmin) && (d.startTime <= xmax)))

		minP = +d3.min(filtered, d => d['amount'])
		maxP = +d3.max(filtered, d => d['amount'])
		buffer = Math.floor((maxP - minP) * 0.1)

		yScale.domain([0, maxP + buffer])

		chartBody.selectAll('line').remove()
		svg.selectAll('.depth').remove()

		depth = chartBody.selectAll('.depth')
			.data(data)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i))
			.attr('class', 'depth')
			.attr('price', d => d.price)
			.attr('amount', d => d.amount)
			.attr('y', d => yScale(d.amount))
			.attr('width', xBand.bandwidth()*zoomQuantity)
			.attr('height', height*10)
			.attr('fill', d => (d.side === 'sell') ? 'red' : 'green')

		gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())

		zoom.translateBy(svg,0,0)
	}

	function prefixSum (arr) {
		const acc = [arr[0]]
		for(let i = 1 ; i < arr.length; i++){
			acc.push({
				amount: arr[i].amount + acc[i-1].amount,
				side: arr[i].side,
				price: arr[i].price,
				timestamp: arr[i].timestamp,
				datetime: arr[i].datetime
			})
		}
		return acc
	}

	function wrap(
		selection: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>,
		_width: number
	) {
		selection.each(function() {
			const text = d3.select(this)
			const words = text.text().split(/\s+/).reverse()
			const lineHeight = 1.1 // ems
			const y = text.attr('y')
			const dy = parseFloat(text.attr('dy'))
			let lineNumber = 0
			let line = []
			let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em')

			let word: string
			while (word = words.pop()) {
				line.push(word)
				tspan.text(line.join(' '))
				if (tspan.node().getComputedTextLength() > _width) {
					line.pop()
					tspan.text(line.join(' '))
					line = [word]
					tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word)
				}
			}
		})
	}

</script>

<svg id='depthChart'></svg>
