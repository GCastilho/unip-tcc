<svelte:head>
	<link rel='stylesheet'>
</svelte:head>

<script lang='ts'>
	import { onMount } from 'svelte'
	import * as d3 from 'd3'
	import type { MarketDepth } from '../../../../../interfaces/market'

	/** a largura real do grafico, visivel + invisivel */
	const margin = {top: 15, right: 105, bottom: 105, left: 50}
	/** a largura visivel da porçao do grafico */
	const width = 650 - margin.left - margin.right
	const height = 450 - margin.top - margin.bottom

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

	/** o corpo inteiro do grafico */
	let svg : d3.Selection<Element, unknown, any, any>
	/** o corpo das colunas do grafico */
	let depth : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala X e seus valores*/
	let gX : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** desenha a escala Y e as linhas */
	let gY : d3.Selection<SVGGElement, unknown, HTMLElement, any>
	/** a parte do grafico aonde ficam as colunas */
	let chartBody
	
	export let _data: MarketDepth[] = []
	/** the internal data, used to not modify the store, it does not work otherwise IDKW */
	let data
	onMount(() => {
		drawChart(_data)
	})
	$: updateDepth(_data)

	function drawChart(depthData: MarketDepth[]) {
		data = orderData(depthData)
		svg = d3.select('#depthChart')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' +margin.left+ ',' +margin.top+ ')')


		let xmax = Math.max(...data.map(v => v.price))

		xScale = d3.scaleLinear()
			.domain([ -1 , data.length])
			.range([0, width])

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

		const ymax = Math.max(...data.map( (r: MarketDepth) => r.volume)) || 100

		yScale = d3.scaleLinear().domain([0, ymax]).range([height, 0])
		
		gY = svg.append('g')
			.call(
				d3.axisLeft(yScale).tickFormat(d3.format("~f")).tickValues(
					d3.scaleLinear().domain(yScale.domain()).ticks()
				)
			)
			.call(g => g.selectAll(".tick line")
				.clone()
				.attr("stroke-opacity", 0.2)
				.attr("x2", width)
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
			.attr('volume', d => d.volume)
			.attr('y', d => yScale(d.volume))
			.attr('width', xBand.bandwidth())
			.attr('height', d => height*10 )
			.attr('fill', (d: MarketDepth)=> (d.type === 'sell') ? 'red' : 'green')
		
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
		zoom.scaleTo(svg, 1, )

		function zoomed(event: { transform: d3.ZoomTransform; }) {
			transform = event.transform
			zoomQuantity = transform.k
			let xScaleZ = transform.rescaleX(xScale)
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

				minP = +d3.min(filtered, (d: MarketDepth) => d.volume)
				maxP = +d3.max(filtered, (d: MarketDepth) => d.volume)
				buffer = Math.floor((maxP - minP) * 0.1)
			
				yScale.domain([0, maxP + buffer])
				depth.transition()
					.duration(transitionDuration)
					.attr('y', (d: MarketDepth) => yScale(d.volume))
					.attr('height', height*10)// gambiarra pra deixar bonito

				gY.transition().duration(transitionDuration)
					.call(d3.axisLeft(yScale)
						.tickValues(d3.scaleLinear().domain(yScale.domain()).ticks())
					)
					.call(g => g.selectAll(".tick line")
						.attr("stroke-opacity", 0.2)
						.attr("x2", width )
					)

			}, transitionStartTimeout)
		}
	}

	function updateDepth (depthData: MarketDepth[]) {
		if(!svg) return
		data = orderData(depthData)
		const extent: [[number, number], [number, number]] = [[0, 0], [width, height/2]] 
		zoom.translateExtent(extent)

		svg.call(zoom)

		xScale=	d3.scaleLinear()
			.domain([ -1 , data.length])
			.range([0, width])
		xBand = d3.scaleBand()
			.domain(d3.range(-1, data.length).map(v => v.toString()))
			.range([0, width]).padding(0.2)
		let xScaleZ = transform.rescaleX(xScale)
	
		//redefine dominio da escala
		const xPriceScale = d3.scaleQuantize()
			.domain([0, data.length])
			.range(data.map(d => d.price))
	
		const xmin = xPriceScale(Math.floor(xScaleZ.domain()[0]))
		const xmax = xPriceScale(Math.floor(xScaleZ.domain()[1]))

		filtered = data.filter(d => ((d.price >= xmin) && (d.price <= xmax)))

		minP = +d3.min(filtered, (d: MarketDepth) => d.volume)
		maxP = +d3.max(filtered, (d: MarketDepth) => d.volume)
		buffer = Math.floor((maxP - minP) * 0.1)

		yScale.domain([0, maxP + buffer])

		svg.selectAll('.depth').remove()

		depth = chartBody.selectAll('.depth')
			.data(data)
			.enter()
			.append('rect')
			.attr('x', (d, i) => xScale(i))
			.attr('class', 'depth')
			.attr('price', d => d.price)
			.attr('volume', d => d.volume)
			.attr('y', d => yScale(d.volume))
			.attr('width', xBand.bandwidth()*zoomQuantity)
			.attr('height', height*10)
			.attr('fill', d => (d.type == 'sell') ? 'red' : 'green')

		gX.selectAll('.tick text')
			.call(wrap, xBand.bandwidth())

		zoom.translateBy(svg,0,0)
	}

	function prefixSum (arr: MarketDepth[]) {
		const acc = [arr[0]]
		for(let i = 1 ; i < arr.length; i++){
			acc.push({
				volume: arr[i].volume + acc[i-1].volume,
				type: arr[i].type,
				price: arr[i].price,
				currencies: arr[i].currencies
			})
		}
		return acc
	}

	function orderData (array: MarketDepth[]){
		array = array.sort((a, b) => {
			return (a.price > b.price) ? 1 : ((b.price > a.price) ? -1 : 0);
		})

		const typeSeparationIndex = array.findIndex(v=> v.type == 'sell')
		const bids = prefixSum(array.slice(0, typeSeparationIndex).reverse()).reverse()
		
		const asks = prefixSum(array.slice(typeSeparationIndex, array.length))
		bids.push(...asks)
		return bids
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
