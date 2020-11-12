<script lang='ts'>
	import * as prices from '../../stores/prices'
	import * as depth from '../../stores/depth'
	import * as marketPrice from '../../stores/marketPrice'
	import BuySell from './_buySell.svelte'
	import OpenOrders from './_openOrders.svelte'
	import CloseOrders from './_closeOrders.svelte'
	import ExchangeIcon from './exchange.svg'
	import Candle from './_components/candle.svelte'
	import Depth from './_components/depth.svelte'
	import * as currencies from '../../stores/currencies'
	import Tabs from 'svelte-tabs/src/Tabs.svelte';
	import Tab from 'svelte-tabs/src/Tab.svelte';
	import TabList from 'svelte-tabs/src/TabList.svelte';
	import TabPanel from 'svelte-tabs/src/TabPanel.svelte';

	let baseCurrency
	let targetCurrency

	/** Bind na função switchPrice exportada na BuySell */
	let switchPrice

	// popula o grafico de depth
	$: {
		prices.fetch([baseCurrency?.name, targetCurrency?.name])
		depth.fetch([baseCurrency?.name, targetCurrency?.name])
		marketPrice.fetch([baseCurrency?.name, targetCurrency?.name])
	} 

	function switchCoins() {
		let aux = baseCurrency
		baseCurrency = targetCurrency
		targetCurrency = aux
		switchPrice()
	}
</script>

<style>
	:global(.svelte-tabs .svelte-tabs__tab-list) {
		border: 0;
		-webkit-touch-callout: none; 
		-webkit-user-select: none;
		-khtml-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
	}

	:global(.svelte-tabs li.svelte-tabs__tab:hover) {
		color: #F0AE98;
	}

	:global(.svelte-tabs li.svelte-tabs__tab:focus) {
		outline: none;
	}

	:global(.svelte-tabs li.svelte-tabs__selected) {
		color: #eb3e00;
		border-bottom: 2px solid #F0AE98;
	}

	:global(.svelte-tabs li.svelte-tabs__selected:hover) {
		color: #eb3e00;
	}

	.main {
		display: flex;
		margin-top: 20px;
		height: 100%;
		width: 100%;
		flex-grow: 1;
		flex-direction: row;
		justify-content: flex-start;
	}

	.main > div {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.main > div > div {
		display: flex;
		flex-direction: row;
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


<div class="main">
	<BuySell
		bind:switchPrice
		{baseCurrency}
		{targetCurrency}
	>
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
	</BuySell>
	<div>
		<div>
			<Candle prices={$prices} />
			<Depth _data={$depth}/>		
		</div>
		<Tabs>
			<TabList>
				<Tab>Open Orders</Tab>
				<Tab>Close Orders</Tab>
			</TabList>
			
			<TabPanel>
				<OpenOrders/>
			</TabPanel>
			
			<TabPanel>
				<CloseOrders/>
			</TabPanel>
		</Tabs>
	</div>
</div>

