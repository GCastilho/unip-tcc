<svelte:head>
	<link rel='stylesheet' href='candlestick.css'>
</svelte:head>

<script lang='ts'>
	import { onMount } from 'svelte'
	import * as d3 from 'd3'
	import type { PriceHistory } from '../../../../../interfaces/market'

	const months = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}
	let transitionDuration = 800
	let transitionStartTimeout = 50
	const maxItemView = 150
	let currentMaxItemView = 150
	let virtualWidth: number
	const margin = {top: 15, right: 65, bottom: 205, left: 50}
	const w = 1000 - margin.left - margin.right
	const h = 625 - margin.top - margin.bottom

	/** the current zoon scale */
	let k : number
	/** the current transform data */
	let t : d3.ZoomTransform

	let xmin : number

	let xmax : number

	let xScale : d3.ScaleLinear<number,number>
	
	let yScale : d3.ScaleLinear<number,number>

	let xBand : d3.ScaleBand<string>

	let xAxis : d3.Axis<d3.NumberValue>
	/** desenha a escala X e seus valores*/
	let gX : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala Y e as linhas */
	let gY : d3.Selection<SVGGElement, unknown, HTMLElement, any>

	//	Selection<BaseType, unknown, HTMLElement, any>' is not assignable to parameter of type ' 

	let svg : d3.Selection<Element, unknown, any, any>

	let filtered: PriceHistory[], minP: number, maxP: number, buffer : number

	let zoom : d3.ZoomBehavior<Element, unknown>
	
	let dates : number[]

	// draw rectangles
	let candles : d3.Selection<SVGGElement, unknown, HTMLElement, any>

	// draw high and low
	let stems : d3.Selection<SVGGElement, unknown, HTMLElement, any>

	let chartBody
	export let prices: PriceHistory[] = []

	onMount(() => {
		drawChart(prices)
	})
	$: updateCandles(prices)

	function drawChart(prices: PriceHistory[]) {
		currentMaxItemView =  Math.min(maxItemView, prices.length)
		virtualWidth = (w / currentMaxItemView) * prices.length
		console.log(virtualWidth)
		svg = d3.select('#candleGraph')
			.attr('width', w + margin.left + margin.right)
			.attr('height', h + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')

		xmax = Math.max(...prices.map(v => v.startTime))
		dates = prices.map(p => p.startTime)

		xScale = d3.scaleLinear()
			.domain([ -1 , dates.length])
			.range([0, virtualWidth])

		xBand = d3.scaleBand()
			.domain(d3.range(-1, dates.length).map(v => v.toString()))
			.range([0, w]).padding(0.3)

		xAxis = d3.axisBottom(xScale)
			.tickFormat(d => formatDate(dates, d))

		svg.append('rect')
			.attr('id','rect')
			.attr('width', w)
			.attr('height', h)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.attr('clip-path', 'url(#clip)')

		gX = svg.append('g')
			.attr('class', 'axis x-axis') // Assign 'axis' class
			.attr('transform', 'translate(0,' + h + ')')
			.call(xAxis)

		gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())

		const ymin = d3.min(prices.map(r => r.low)) || 1
		const ymax = d3.max(prices.map(r => r.high)) || 100

		yScale = d3.scaleLinear().domain([ymin, ymax]).range([h, 0]).nice()
		
		//desenha a escala Y e as linhas
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
		
		// draw rectangles
		candles = chartBody.selectAll('.candle')
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
		stems = chartBody.selectAll('g.line')
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
			.attr('width', virtualWidth)
			.attr('height', h)
		const extent: [[number, number], [number, number]] = [[0, 0], [xScale(prices.length-1), h/2]] // eu nao sei o que esse h/2 faz
		let resizeTimer
		
		//.scaleExtent delimita um limite minimo e maximo para zoom
		//pequenas mudanças de valores trazem mudanças drasticas no limite inferior e superior do zoom
		//possivelmente um bom valor para se mudar no futuro
		zoom = d3.zoom()
			.scaleExtent([1, 70])
			.translateExtent(extent)
			.extent(extent)
			.on('zoom', zoomed)
			.on('zoom.end', zoomend)
		svg.call(zoom)
		
		const transitionTimeouBefore = transitionStartTimeout
		const transitionDurationBefore = transitionDuration
		transitionStartTimeout = 1
		transitionDuration = 1

		zoom.scaleTo(svg, dates.length/100, )
		zoom.translateBy(svg,-w/2,0)

		transitionDuration = transitionDurationBefore
		transitionStartTimeout = transitionTimeouBefore
	console.log(xBand.bandwidth()*k )
		function zoomed(event) {
			t = event.transform
			k = t.k
			let xScaleZ = t.rescaleX(xScale)
			console.log(t)
			const hideTicksWithoutLabel = function() {
				d3.selectAll('.xAxis .tick text').each(function(this: any){
					if (this.innerHTML === '') {
						this.parentNode.style.display = 'none'
					}
				})
			}

			gX.call(
				d3.axisBottom(xScaleZ).tickFormat(d => {
					if (d >= 0 && d <= dates.length-1) {
						return formatDate(dates, d)
					}
				})
			)

			candles.attr('x', (d, i) => xScaleZ(i) - (xBand.bandwidth()*t.k)/2)
				.attr('width', xBand.bandwidth()*t.k)
			stems.attr('x1', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5)
			stems.attr('x2', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5)

			hideTicksWithoutLabel()

			gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())
		}

		function zoomend(event) {

			const xDateScale = d3.scaleQuantize()
				.domain([0, dates.length])
				.range(dates)

			let t = event.transform
			console.log(t)
			let xScaleZ = t.rescaleX(xScale)
			clearTimeout(resizeTimer)

			resizeTimer = setTimeout(function() {
				xmin = xDateScale(Math.floor(xScaleZ.domain()[0]))
				xmax = xDateScale(Math.floor(xScaleZ.domain()[1]))
				filtered = prices.filter(d => ((d.startTime >= xmin) && (d.startTime <= xmax)))
				minP = +d3.min(filtered, d => d['low'])
				maxP = +d3.max(filtered, d => d['high'])
				buffer = Math.floor((maxP - minP) * 0.1)

				yScale.domain([minP - buffer, maxP + buffer])
				candles.transition()
					.duration(transitionDuration)
					.attr('y', (d : PriceHistory) => yScale(Math.max(d.open, d.close)))
					.attr('height', (d : PriceHistory) =>  (d.open === d.close) 
						? 1 
						: yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)))

				stems.transition().duration(transitionDuration)
					.attr('y1', (d : PriceHistory) => yScale(d.high))
					.attr('y2', (d : PriceHistory) => yScale(d.low))
				
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
		return 
	}
	function updateCandles (prices:PriceHistory[]) {
		if(!xScale) return
		virtualWidth = (w / currentMaxItemView) * prices.length
		const extent: [[number, number], [number, number]] = [[0, 0], [xScale(prices.length-1), h]] // eu nao sei o que esse h/2 faz

		zoom.translateExtent(extent)
			//.extent(extent)

		svg.call(zoom)
		dates = prices.map(p => p.startTime)

		xScale=	d3.scaleLinear()
			.domain([ -1 , dates.length])
			.range([0, virtualWidth])
		xBand = d3.scaleBand()
			.domain(d3.range(-1, dates.length).map(v => v.toString()))
			.range([0, virtualWidth]).padding(0.3)
		let xScaleZ = t.rescaleX(xScale)
	
		//redefine dominio da escala
		const xDateScale = d3.scaleQuantize()
			.domain([0, dates.length])
			.range(dates)
	
		xmin = xDateScale(Math.floor(xScaleZ.domain()[0]))
		xmax = xDateScale(Math.floor(xScaleZ.domain()[1]))
		filtered = prices.filter(d => ((d.startTime >= xmin) && (d.startTime <= xmax)))
		minP = +d3.min(filtered, d => d['low'])
		maxP = +d3.max(filtered, d => d['high'])
		buffer = Math.floor((maxP - minP) * 0.1)
		yScale.domain([minP - buffer, maxP + buffer])

		chartBody.selectAll('line').remove()
		svg.selectAll('.candle').remove()

		candles = chartBody.selectAll('.candle')
			.data(prices)
			.enter()
			.append('rect')
			.attr('class', 'candle')
			.attr('x', (d, i) => xScale(i) - (xBand.bandwidth()*t.k) )
			.attr('y', d => yScale(Math.max(d.open, d.close)))
			.attr('width', xBand.bandwidth()*k)
			.attr('fill', d => (d.open === d.close) ? 'silver' : (d.open > d.close) ? 'red' : 'green')
			.attr('height',  d => (d.open === d.close) ? 1 : yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)))
		const modifier = k > 1 ? 0 : 1

		stems = chartBody.selectAll('g.line')
			.data(prices)
			.enter()
			.append('line')
			.attr('class', 'stem')
			.attr('x1', (d, i) => xScale(i) - (xBand.bandwidth()/2)*modifier)
			.attr('x2', (d, i) => xScale(i) - (xBand.bandwidth()/2)*modifier)
			.attr('y1', d => yScale(d.high))
			.attr('y2', d => yScale(d.low))
			.attr('stroke', d => (d.open === d.close) ? 'white' : (d.open > d.close) ? 'red' : 'green')

			zoom.translateBy(svg,-virtualWidth,0)
			gX.selectAll('.tick text')
				.call(wrap, xBand.bandwidth())

	}

	function formatDate(dates: number[], d: d3.NumberValue | d3.AxisDomain){
		const date = new Date(dates[d.valueOf()])
		if (Number.isNaN(date.valueOf())) return ''
		const hours = date.getHours()
		const minutes = (date.getMinutes()<10?'0':'') + date.getMinutes()
		const amPM = hours < 13 ? 'am' : 'pm'
		return `${hours}:${minutes}${amPM} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
	}

	function wrap(
		selection: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>,
		width: number
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
				if (tspan.node().getComputedTextLength() > width) {
					line.pop()
					tspan.text(line.join(' '))
					line = [word]
					tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word)
				}
			}
		})
	}
</script>

<svg id='candleGraph'></svg>
