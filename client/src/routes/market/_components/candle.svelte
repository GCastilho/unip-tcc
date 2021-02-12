<svelte:head>
	<link rel='stylesheet' href='candlestick.css'>
</svelte:head>

<script lang='ts'>
	import { onMount } from 'svelte'
	import * as d3 from 'd3'
	import type { PriceHistory } from '../../../../../interfaces/market'

	const months = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}
	/** o numero maximo possivel de itens da tabela que aparecem ao mesmo tempo */
	const maxItemView = 150
	/** o numero de itens que serao exibidos na tabela, valor maximo = maxItemView */
	const margin = {top: 15, right: 55, bottom: 105, left: 50}
	/** a largura visivel da porçao do grafico */
	const width = 600 - margin.left - margin.right
	const height = 450 - margin.top - margin.bottom
	
	let currencies
	/** array de timestamps das ordens */
	let dates : number[]
	/** mapeia o posicionamento ordenado dos itens, referente a graduaçao Inferior (X) */
	let xScale : d3.ScaleLinear<number,number>
	/** mapeia o posicionamento ordenado dos itens, referente a graduaçao Lateral (Y) */
	let yScale : d3.ScaleLinear<number,number>

	let xBand : d3.ScaleBand<string>
	/** ordena os valores presentes na regua, referente a graduaçao Lateral (Y) */
	let xAxis : d3.Axis<d3.NumberValue>
	
	// algumas variaveis auxiliares que nao tem muita importancia
	let filtered: PriceHistory[], minP: number, maxP: number, buffer : number

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

	/** o corpo inteiro do grafico */
	let svg : d3.Selection<Element, unknown, any, any>
	/** o corpo das velas */
	let candles : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** a haste inferior e superior das velas */
	let stems : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala X e seus valores*/
	let gX : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala Y e as linhas */
	let gY : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** a parte do grafico aonde ficam as colunas */
	let chartBodyA
	let chartBodyB
	let chartBodyC
	let index = 1

	let candlesB
	let candlesC
	
	let translateQuantity = 0

	export let prices: PriceHistory[] = 
	[]

	onMount(() => {
		drawChart(prices)
	})
	//$: updateCandles(prices)
	
	// export function _drawChart(){
	// 	drawChart([])
	// }
	
	export function drawChart(prices: PriceHistory[]) {
	prices = [{
		open: 10,
		close: 5,
		high: 12,
		low: 2,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},
		{
		open: 5,
		close: 6,
		high: 7,
		low: 4,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},{
		open: 6,
		close: 5,
		high: 6,
		low: 5,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},{
		open: 5,
		close: 6,
		high: 18,
		low: 1,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},{
		open: 6,
		close: 1,
		high: 7,
		low: 1,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},{
		open: 1,
		close: 1,
		high: 1,
		low: 1,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		},
		{
		open: 6,
		close: 1,
		high: 7,
		low: 1,
		startTime: 1610755637,
		duration: 1,
		currencies: ['bitcoin', 'nano']
		}
	]
		currencies = prices[0].currencies || []
		svg = d3.select('#candleGraph')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')

		let viewPort = d3.select('#viewPort')
			.attr('width', width)
			.attr('height', height )
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')


		dates = prices.map(p => p.startTime)

		xScale = d3.scaleLinear()
			.domain([-1 , dates.length-1])
			.range([0, width])

		xBand = d3.scaleBand()
			.domain(d3.range(-1, dates.length-1).map(v => v.toString()))
			.range([0, width]).padding(0.2)

		xAxis = d3.axisBottom(xScale)
			.tickFormat(d => formatDate(dates, d.valueOf()))

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

		const ymin = d3.min(prices.map(r => r.low))
		const ymax = d3.max(prices.map(r => r.high))

		yScale = d3.scaleLinear().domain([ymin, ymax]).range([height, 0]).nice()

		console.log('yScale', yScale(0))
		gY = svg.append('g')
			.call(
				d3.axisLeft(yScale).tickFormat(d3.format("$~f")).tickValues(
					d3.scaleLinear().domain(yScale.domain()).ticks()
				)
			)
			.call(g => g.selectAll(".tick line")
				.clone()
				.attr("stroke-opacity", 0.2)
				.attr("x2", width )
			)
		
		chartBodyA = viewPort.append('g')
			.attr('class', 'chartBody')
			.attr('clip-path', 'url(#clip)')

		chartBodyB = viewPort.append('g')
			.attr('class', 'chartBody')
			.attr('clip-path', 'url(#clip)')
			.attr("transform", `translate(${-width},0)`)
		
		chartBodyC = viewPort.append('g')
			.attr('class', 'chartBody')
			.attr('clip-path', 'url(#clip)')
			.attr("transform", `translate(${width},0)`)
		
		// draw rectangles
		candles = chartBodyA.selectAll('.candle')
			.data(prices)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i) - xBand.bandwidth())
			.attr('class', 'candle')
			.attr('y', d => yScale(Math.max(d.open, d.close)))
			.attr('width', xBand.bandwidth())
			.attr('height', d => (d.open === d.close) ? 1 : yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)))
			.attr('fill', d => (d.open === d.close) ? 'silver' : (d.open > d.close) ? 'red' : 'green')
		
		candlesB = chartBodyB.selectAll('.candle')
			.data(prices)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i) - xBand.bandwidth())
			.attr('class', 'candle')
			.attr('y', d => yScale(Math.max(d.open, d.close)))
			.attr('width', xBand.bandwidth())
			.attr('height', d => (d.open === d.close) ? 1 : yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)))
			.attr('fill', d => (d.open === d.close) ? 'silver' : (d.open > d.close) ? 'red' : 'green')
		
		candlesC = chartBodyC.selectAll('.candle')
			.data(prices)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i) - xBand.bandwidth())
			.attr('class', 'candle')
			.attr('y', d => yScale(Math.max(d.open, d.close)))
			.attr('width', xBand.bandwidth())
			.attr('height', d => (d.open === d.close) ? 1 : yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)))
			.attr('fill', d => (d.open === d.close) ? 'silver' : (d.open > d.close) ? 'red' : 'green')

		// draw high and low
		stems = chartBodyA.selectAll('g.line')
			.data(prices)
			.enter()
			.append('line')
			.attr('class', 'stem')
			.attr('x1', (d, i) => xScale(i) - xBand.bandwidth()/2)
			.attr('x2', (d, i) => xScale(i) - xBand.bandwidth()/2)
			.attr('y1', d => yScale(d.high))
			.attr('y2', d => yScale(d.low))
			.attr('stroke', d => (d.open === d.close) ? 'white' : (d.open > d.close) ? 'red' : 'green')

		svg.append('defs')
			.append('clipPath')
			.attr('id', 'clip')
			.append('rect')
			.attr('width', width)
			.attr('height', height)

		zoom = d3.zoom()
			.scaleExtent([1, 70])
			.translateExtent([[Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER],[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]])
			.on('zoom', zoomed)
 
		svg.call(zoom)
		
		function zoomed(event: { transform: d3.ZoomTransform; }) {
			transform = event.transform
			transform.translate
			zoomQuantity = transform.k
			// let xScaleZ = transform.rescaleX(xScale)
			// const hideTicksWithoutLabel = function() {
			// 	d3.selectAll('.xAxis .tick text').each(function(this: any){
			// 		if (this.innerHTML === '') {
			// 			this.parentNode.style.display = 'none'
			// 		}
			// 	})
			// }
			console.log(transform.x)
			console.log(translateQuantity += transform.x)
			chartBodyA.transition().duration(0).attr("transform", `translate(${transform.x},0)`)
			chartBodyB.transition().duration(0).attr("transform", `translate(${-width+transform.x},0)`)
			chartBodyC.transition().duration(0).attr("transform", `translate(${width+transform.x},0)`)

			// gX.call(
			// 	d3.axisBottom(xScaleZ).tickFormat(d => {
			// 		if (d >= 0 && d <= dates.length-1) {
			// 			return formatDate(dates, d.valueOf())
			// 		}
			// 	})
			// )

			// candles.attr('x', (d, i) => xScaleZ(i) - (xBand.bandwidth()*transform.k)/2)
			// 	.attr('width', xBand.bandwidth()*transform.k)
			// stems.attr('x1', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5)
			// stems.attr('x2', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5)

			// hideTicksWithoutLabel()

			gX.selectAll('.tick text')
				.call(wrap, xBand.bandwidth())
		}
		
		
		//.scaleExtent delimita um limite minimo e maximo para zoom
		//pequenas mudanças de valores trazem mudanças drasticas no limite inferior e superior do zoom
		//possivelmente um bom valor para se mudar no futuro
		
		const transitionTimeouBefore = transitionStartTimeout
		const transitionDurationBefore = transitionDuration
		transitionStartTimeout = 1
		transitionDuration = 1

		transitionDuration = transitionDurationBefore
		transitionStartTimeout = transitionTimeouBefore

		
		return 
	}
	/**
	 * muda a escrita de uma data especifica e esconde valores invalidos
	 * @param dates o array de datas
	 * @param index o index das datas
	 */
	function formatDate(dates: number[], index: number){
		const date = new Date(dates[index])
		if (Number.isNaN(date.valueOf())) return ''
		const hours = date.getHours()
		const minutes = (date.getMinutes()<10?'0':'') + date.getMinutes()
		const amPM = hours < 13 ? 'am' : 'pm'
		return `${hours}:${minutes}${amPM} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
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

<svg id='candleGraph'>
	<svg id='viewPort'>
	</svg>
</svg>



chartBody1
chartBody2
chartBody3
