<script>
	import Close from './cross-icon.svg'
	import * as currencies  from '../../../stores/currencies'	

	export let type
	export let status
	export let amount = 0
	export let currency
	export let account
	export let txid
	export let timestamp

	const coin = $currencies.find(value => currency === value.name)
	const txColor = status === 'confirmed' ? 'green' : '#c2c21c'
	const tablePropotions = status === 'processing' ? '10% 13% 57% 16% auto' : '10% 13% 57% 16%'
	console.log(coin)
	function cancelTx() {
		console.log('Voce clicou em mim!!, o que significa que vc quer cancelar, VOCÊ NÃO DEVIA CANCELAR A OPERAÇÃO')
	}

	function getDate(timestamp) {
		const dateTime = new Date(timestamp)
		return dateTime.toLocaleDateString()+' '+dateTime.toLocaleTimeString()
	}
</script>

<style>
	.table-row {
		display: grid;
		grid-template-columns: var(--tablePropotions);
		overflow: visible;
		background-color: #fdf9f9;
		border-bottom: 1px solid var(--table-borders);
	}

	.table-row:nth-child(2n) {
		background-color: #FFF7F3;
	}

	.table-row:last-of-type{
		border-bottom: 0;
	}

	.table-row > div {
		display: flex;
		flex-direction: column;
		padding-left: 10px;
		white-space: nowrap;
	}

	.table-row > div:last-child {
		flex-direction: row;
		justify-content: flex-end;
	}

	.status-tx {
		border-left: 3px solid var(--txColor)
	}

	.status-tx > div:last-child {
		color: var(--txColor);
	}

	button {
		align-self: center;
		background-color: transparent;
		width: 20px;
		padding: 0;
		height: 20px;
		border: 0;
		outline: 0;
		opacity: 0.6;
		transition: 0.3s;
		fill: #6f6868;
		justify-self: center;
	}

	button:hover {
		opacity: 1;
		cursor: pointer;
	}

	button:active {
		transition: 0s;
		fill: black;
	}
</style>

<div class="table-row" style="--tablePropotions:{tablePropotions}">
	<div class="status-tx" style="--txColor:{txColor}">
		<div title="Type">{type}</div>
		<div title="Status">{status}</div>
	</div>
	<div title="Amount" style="text-align: end">
		{`${amount.toFixed(coin.decimals || 0)} ${coin.code.toUpperCase()}`}
	</div>
	<div style="padding-left: end">
		<div title="Account">{account}</div>
		<div title="Transaction ID">{txid || '--'}</div>
	</div>
	<div style="text-align: end">
		{getDate(timestamp)}
	</div>
	{#if status === 'processing'}
		<button title="Cancel Transaction" on:click={cancelTx}>
			<Close width="20px" height="20px"/>
		</button>
	{/if}
</div>
