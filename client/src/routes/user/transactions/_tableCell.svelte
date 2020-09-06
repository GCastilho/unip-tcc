<script>
	import { afterUpdate } from 'svelte';
	import Close from './cross-icon.svg'
	import { format } from 'light-date'
	import * as currencies from '../../../stores/currencies'

	export let status
	export let currency
	export let txid
	export let account
	export let amount
	export let type
	export let confirmations
	export let timestamp
	export let fee

	let coin, name, code, decimals, dateTime

	afterUpdate(() => {
		if (status == 'confirmed') confirmations = null
	})

	$: txColor = status == 'confirmed' ? 'green'
		: status == 'canceled' ? '#e64d51'
		: status == 'pending' ? '#c2c21c'
		: '#89a1c1'

	$: {
		coin = $currencies.find(value => currency === value.name)

		if (coin) {
			name = coin.name
			code = coin.code.toUpperCase()
			amount = amount.toFixed(coin.decimals)
			fee = (fee || 0).toFixed(coin.decimals)
		}
	}

	function cancelTx() {
		console.log('Voce clicou em mim!!! o que significa que vc quer cancelar, VOCÊ NÃO DEVIA CANCELAR A OPERAÇÃO')
	}

	/**
	 * Converte um timestamp para um padrão legivel
	 */
	$: dateTime = timestamp ? format(new Date(timestamp), '{HH}:{mm} - {dd}/{MM}/{yyyy}') : null
</script>

<style>
	.table-row {
		display: grid;
		grid-template-columns: 10% 13% 59% 14% auto;
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

	.status-tx, .account-tx {
		display: flex;
		flex-direction: column;
		padding-left: 10px;
		white-space: nowrap;
	}

	.status-tx {
		border-left: 3px solid var(--txColor)
	}

	.status-tx > div:last-child {
		color: var(--txColor);
	}

	.amount-tx {
		display: grid;
		grid-template-columns: auto 26%;
		align-self: center;
	}

	.amount-tx > span:nth-child(2n) {
		text-align: start;
		padding-left: 5px;
	}

	.date-tx {
		flex-direction: row;
		text-align: end;
		align-self: center;
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

<div class="table-row">
	<div class="status-tx" style="--txColor:{txColor}">
		<div title="Type">{type}</div>
		<div title="Status">{status + (typeof confirmations == 'number' ? ` (${confirmations})` : '')}</div>
	</div>
	<div class="amount-tx" title="Amount" style="text-align: end">
		<span title="Amount">{amount}</span>
		<span title={name}>{code}</span>
		{#if fee > 0}
			<span title="Fee">{fee}</span>
			<span title="Fee">Fee</span>
		{/if}
	</div>
	<div class="account-tx" style="padding-left: end">
		<div title="Account">{account}</div>
		<div title="Transaction ID">{txid || '--'}</div>
	</div>
	<div class="date-tx" title="Date">
		{dateTime || ''}
	</div>
	{#if status === 'processing'}
		<button title="Cancel Transaction" on:click={cancelTx}>
			<Close width="20px" height="20px"/>
		</button>
	{/if}
</div>