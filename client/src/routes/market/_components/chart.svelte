<svelte:head>
	<link rel='stylesheet' href='candlestick.css'>
</svelte:head>

<script lang='ts'>
	import { onMount } from 'svelte'
	import _ from 'lodash'
	import * as d3 from 'd3'
	import type { PriceHistory } from '../../../../../interfaces/market'
	import * as prices from '../../../stores/prices'

	const months = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}

	const transitionDuration = 600
	const transitionStartTimeout = 100

	function formatDate(dates: number[], d: d3.NumberValue | d3.AxisDomain){
		const date = new Date(dates[d as number])
		const hours = date.getHours()
		const minutes = (date.getMinutes()<10?'0':'') + date.getMinutes()
		const amPM = hours < 13 ? 'am' : 'pm'
		return `${hours}:${minutes}${amPM} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
	}

	function drawChart(prices: PriceHistory[]) {
		let hours, minutes, amPM, filtered, minP, maxP, buffer
		const margin = {top: 15, right: 65, bottom: 205, left: 50}
		const w = 1000 - margin.left - margin.right
		const h = 625 - margin.top - margin.bottom
		const svg = d3.select('#candleGraph')
			.attr('width', w + margin.left + margin.right)
			.attr('height', h + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')

		let xmax = Math.max(...prices.map(v => v.startTime))
		const dates = prices.map(p => p.startTime)

		const xScale = d3.scaleLinear()
			.domain([-1, dates.length])
			.range([0, w])

		const xDateScale = d3.scaleQuantize()
			.domain([0, dates.length])
			.range(dates)

		const xBand = d3.scaleBand()
			.domain(d3.range(-1, dates.length).map(v => v.toString()))
			.range([0, w]).padding(0.3)

		const xAxis = d3.axisBottom(xScale)
			.tickFormat((d) => {
				const date = new Date(dates[d as number])
				const hours = date.getHours()
				const minutes = (date.getMinutes()<10?'0':'') + date.getMinutes()
				const amPM = hours < 13 ? 'am' : 'pm'
				return `${hours}:${minutes}${amPM} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
			})

		svg.append('rect')
			.attr('id','rect')
			.attr('width', w)
			.attr('height', h)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.attr('clip-path', 'url(#clip)')

		const gX = svg.append('g')
			.attr('class', 'axis x-axis') // Assign 'axis' class
			.attr('transform', 'translate(0,' + h + ')')
			.call(xAxis)

		gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())

		const ymin = d3.min(prices.map(r => r.low))
		const ymax = d3.max(prices.map(r => r.high))
		const yScale = d3.scaleLinear().domain([ymin, ymax]).range([h, 0]).nice()
		const gY = svg.append('g')
			.call(
				d3.axisLeft(yScale).tickFormat(d3.format("$~f")).tickValues(
					d3.scaleLinear().domain(yScale.domain()).ticks()
				)
			)
			.call(g => g.selectAll(".tick line")
				.clone()
				.attr("stroke-opacity", 0.2)
				.attr("x2", w )
			)

		const chartBody = svg.append('g')
			.attr('class', 'chartBody')
			.attr('clip-path', 'url(#clip)');

		// draw rectangles
		const candles = chartBody.selectAll('.candle')
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
		const stems = chartBody.selectAll('g.line')
			.data(prices)
			.enter()
			.append('line')
			.attr('class', 'stem')
			.attr('x1', (d, i) => xScale(i) - xBand.bandwidth()/2)
			.attr('x2', (d, i) => xScale(i) - xBand.bandwidth()/2)
			.attr('y1', d => yScale(d.high))
			.attr('y2', d => yScale(d.low))
			.attr('stroke', d => (d.open === d.close) ? 'white' : (d.open > d.close) ? 'red' : 'green');

		svg.append('defs')
			.append('clipPath')
			.attr('id', 'clip')
			.append('rect')
			.attr('width', w)
			.attr('height', h)

		const extent: [[number, number], [number, number]] = [[0, 0], [w, h]]
		var resizeTimer

		//.scaleExtent delimita um limite minimo e maximo para zoom
		//pequenas mudanças de valores trazem mudanças drasticas no limite inferior e superior do zoom
		//possivelmente um bom valor para se mudar no futuro
		var zoom = d3.zoom()
			.scaleExtent([1, 100])
			.translateExtent(extent)
			.extent(extent)
			.on('zoom', zoomed)
			.on('zoom.end', zoomend)
		svg.call(zoom)

		function zoomed(this: Element, event) {
			var t = event.transform;
			let xScaleZ = t.rescaleX(xScale)

			//esse codigo aparentemente nao esta funcionando
			//acredito que ele serviria para se livrar de NaN quando nao se tem um dado para se colocar na regua
			const hideTicksWithoutLabel = function() {
				d3.selectAll('.xAxis .tick text').each(function(d){
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
				.attr('width', xBand.bandwidth()*t.k);
			stems.attr('x1', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5);
			stems.attr('x2', (d, i) => xScaleZ(i) - xBand.bandwidth()/2 + xBand.bandwidth()*0.5);

			hideTicksWithoutLabel();

			gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())
		}

		function zoomend(event) {
			var t = event.transform
			let xScaleZ = t.rescaleX(xScale)
			clearTimeout(resizeTimer)

			resizeTimer = setTimeout(function() {
				const xmin = xDateScale(Math.floor(xScaleZ.domain()[0]))
				xmax = xDateScale(Math.floor(xScaleZ.domain()[1]))
				filtered = _.filter(prices, d => ((d.startTime >= xmin) && (d.startTime <= xmax)))
				minP = +d3.min(filtered, d => d.low)
				maxP = +d3.max(filtered, d => d.high)
				buffer = Math.floor((maxP - minP) * 0.1)

				yScale.domain([minP - buffer, maxP + buffer])
				candles.transition()
					.duration(transitionDuration)
					.attr('y', (d) => yScale(Math.max(d.open, d.close)))
					.attr('height',  d => (d.open === d.close) ? 1 : yScale(Math.min(d.open, d.close))-yScale(Math.max(d.open, d.close)));

				stems.transition().duration(transitionDuration)
					.attr('y1', (d) => yScale(d.high))
					.attr('y2', (d) => yScale(d.low))
				
				gY.transition().duration(transitionDuration)
					.call(d3.axisLeft(yScale)
						.tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
					)
					.call(g => g.selectAll(".tick line")
						.attr("stroke-opacity", 0.2)
						.attr("x2", w )
					)
			}, transitionStartTimeout)
		}
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
		});
	}
	onMount(() => {
		drawChart($prices)
	})
</script>

<svg id='candleGraph'></svg>
