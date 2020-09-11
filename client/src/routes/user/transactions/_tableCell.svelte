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
		border: 1px solid var(--table-borders);
		border-bottom: 0;
		border-left: 0;
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
	}

	.status-tx {
		border-left: 3px solid var(--txColor);
	}

	.status-tx > span:last-child {
		color: var(--txColor);
	}

	.status-tx > span, .account-tx > span {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
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

	.mobile {
		display: none;
		background-color: rgba(255,62,0,0.7);
	}

	@media only screen and (max-width: 900px){
		.table-row {
			grid-template-columns: 50% 50%;
			grid-template-rows: repeat(n, 1fr);
			text-align: center;
		}

		.table-row > div {
			border-left: 0;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;
		}

		.status-tx {
			padding: 0;
		}

		.amount-tx {
			grid-template-columns: auto min-content;
		}

		.amount-tx > span:nth-child(2n) {
			text-align: start;
			padding: 0 5px;
		}

		.date-tx {
			text-align: center;
		}

		.mobile {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			border-left: 1px solid var(--table-borders) !important;
			align-self: center;
		}
	}
</style>

<div class="table-row" style="--txColor:{txColor}">
	<div class="mobile">
		<span>Type</span>
		<span>Status</span>
	</div>
	<div class="status-tx">
		<span title="Type">{type}</span>
		<span title="Status">{status + (typeof confirmations == 'number' ? ` (${confirmations})` : '')}</span>
	</div>
	<div class="mobile">
		<span>Amount</span>
		{#if fee > 0}
			<span>Fee</span>
		{/if}
	</div>
	<div class="amount-tx" title="Amount" style="text-align: end">
		<span title="Amount">{amount}</span>
		<span title={name}>{code}</span>
		{#if fee > 0}
			<span title="Fee">{fee}</span>
			<span title="Fee">Fee</span>
		{/if}
	</div>
	<div class="mobile">
		<span>Account</span>
		<span>Transaction ID</span>
	</div>
	<div class="account-tx" style="padding-left: end">
		<span title="Account">{account}</span>
		<span title="Transaction ID">{txid || '--'}</span>
	</div>
	<div class="mobile">
		<span>Date</span>
	</div>
	<div class="date-tx" title="Date">
		<span>{dateTime || ''}</span>
	</div>
	{#if status === 'processing'}
		<div class="mobile">
			<span>Cancel Transaction</span>
		</div>
		<button title="Cancel Transaction" on:click={cancelTx}>
			<Close width="20px" height="20px"/>
		</button>
	{/if}
</div>
