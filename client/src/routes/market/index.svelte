<script>
	import BuySell from './_buySell.svelte'
	import ExchangeIcon from './exchange.svg'
	import Candle from './_components/chart.svelte'
	import Depth from './_components/depth.svelte'
	import * as currencies from './../../stores/currencies'

	let baseCurrency
	let targetCurrency
	let exchangeCurrency = false

	/** Bind na função switchPrice exportada na BuySell */
	let switchPrice

	function switchCoins() {
		let aux = baseCurrency
		baseCurrency = targetCurrency
		targetCurrency = aux
		switchPrice()
	}
</script>

<style>
	h1 {
		margin-top: 0.5em;
		text-align: center;
	}

	.main {
		display: flex;
		height: 100%;
		width: 100%;
		flex-grow: 1;
		justify-content: center;
	}

	.currency-select {
		display: flex;
		justify-content: center;
		margin: 20px;
	}

	.currency-select > select {
		height: 32px;
		width: 80px;
	}

	.currency-select > select:focus {
		outline: none;
	}

	.currency-select > button {
		align-self: center;
		background-color: transparent;
		width: 15px;
		padding: 0;
		margin: 0 10px;
		height: 15px;
		border: 0;
		outline: 0;
		opacity: 0.6;
		transition: 0.3s;
		fill: #6f6868;
		justify-self: center;
	}

	.currency-select > button:hover {
		opacity: 1;
		cursor: pointer;
	}

	.currency-select > button:active {
		transition: 0s;
		fill: black;
	}
</style>


<h1>Market</h1>
<div class="currency-select">
	<select bind:value={baseCurrency}>
		<option value={null}>...</option>
		{#each $currencies as currency }
			<option value={currency}>
				{currency.name}
			</option>
		{/each}
	</select>
	<button on:click={switchCoins}><ExchangeIcon/></button>
	<select bind:value={targetCurrency}>
		<option value={null}>...</option>
		{#each $currencies as currency }
			<option value={currency}>
				{currency.name}
			</option>
		{/each}
	</select>
</div>
<div class="main">
	<BuySell
		bind:switchPrice
		{baseCurrency}
		{targetCurrency}
		{exchangeCurrency}
	/>
	<Candle />
</div>
<Depth />
