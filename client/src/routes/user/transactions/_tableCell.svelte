<script lang="ts">
	import { format } from 'light-date'
	import { afterUpdate } from 'svelte'
	import { quintOut } from 'svelte/easing'
	import { slide } from 'svelte/transition'
	import Close from './cross-icon.svg'
	import currencies from '../../../utils/currencies'
	import transactions from '../../../stores/transactions'
	import type { Transaction } from '../../../stores/transactions'

	export let transaction: Transaction

	let {
		status,
		opid,
		currency,
		txid,
		account,
		type,
		confirmations,
		timestamp,
	} = transaction

	$: code = currencies[currency]?.code.toUpperCase()
	$: amount = transaction.amount?.toFixed(currencies[currency]?.decimals)
	$: fee = transaction.fee?.toFixed(currencies[currency]?.decimals)

	/** Largura da tabela em pixels*/
	let tableWidth: number

	/** Define se o menu de detalhes da transações esta aberto */
	let disable = false

	// Seta para null se a transação for confimada
	afterUpdate(() => {
		if (status == 'confirmed') confirmations = null
	})

	/** Define qual sera a cor de status da transação */
	$: txColor = status == 'confirmed' ? 'green'
		// : status == 'canceled' ? '#e64d51'
		: status == 'pending' ? '#c2c21c'
		: '#89a1c1'

	/** Handler da função de cancelamento das transações */
	function cancelTx() {
		transactions.cancell(opid)
	}

	// Se a largura da tela for maior que 850px, ele seta para false
	$: disable = tableWidth >= 850 ? false : disable

	/** Handler das linha da tabela, ao clicar na linha a função é acionada */
	function handlerMobile() {
		if(tableWidth > 850) return
		disable = !disable
	}

	/**
	 * Converte um timestamp para um padrão legivel
	 */
	$: time = timestamp ? format(new Date(timestamp), '{HH}:{mm} ') : null
	$: date = timestamp ? format(new Date(timestamp), ' {dd}/{MM}/{yyyy}') : null
</script>

<style>
	.table-row {
		display: flex;
		flex-direction: column;
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

	.desktop-row {
		display: grid;
		grid-template-columns: 10% 13% 59% 14% auto;
		overflow: visible;
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
		height: 100%;
		grid-template-columns: auto 26%;
	}

	.amount-tx > span {
		align-self: center;
	}

	.amount-tx > span:nth-child(2n) {
		text-align: start;
		padding-left: 5px;
	}

	.date-tx {
		text-align: end;
		align-self: center;
		word-spacing: 5px;
	}

	.desktop-row > button {
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

	.mobile-row {
		display: none;
	}

	.mobile-row > button {
		color: white;
		background-color: #ff3e00;
		opacity: 1;
		height: 35px;
		width: 150px;
		border: 0;
		border-radius: 5px;
		outline: 0;
		margin: 10px;
		align-self: center;
		animation: 4s;
		animation-delay: 4s;
	}

	.mobile-row > button:hover {
		opacity: 0.9;
	}

	.mobile-row > button:active {
		background-color: #b52d02;
	}

	.mobile-account-tx {
		display: flex;
		padding: 10px;
		flex-direction: column;
	}

	.mobile-account-tx > span {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	@media only screen and (max-width: 900px){
		.table-row {
			font-size: 15px;
			cursor: pointer;
		}

		.table-row:hover {
			background-color:#f5ede9;
		}

		.desktop-row {
			grid-template-columns: 1fr 1fr 1fr;
			top: 3;
		}

		.status-tx {
			border-left: 4px solid var(--txColor);
		}

		.account-tx {
			display: none;
		}

		.date-tx {
			text-align: center;
			word-spacing: 15px;
		}

		span > span {
			display: none;
		}

		.mobile-row {
			display: flex;
			flex-direction: column;
			border-left: 4px solid var(--txColor);
			opacity: 1;	
		}

		.desktop-row > button {
			display: none;
		}
	}
</style>

<div 
	class="table-row"
	style="--txColor:{txColor}"	
	bind:offsetWidth={tableWidth}
>
	<div class="desktop-row" on:click={handlerMobile} >		
		<div class="status-tx">
			<span title="Type">{type}</span>
			<span title="Status">{status + (typeof confirmations == 'number' ? ` (${confirmations})` : '')}</span>
		</div>
		
		<div class="amount-tx" title="Amount" style="text-align: end">
			<span title="Amount">{amount}</span>
			<span title={currency}>{code}</span>
			{#if +fee > 0}
				<span title="Fee">{fee}</span>
				<span title="Fee">Fee</span>
			{/if}
		</div>
		
		<div class="account-tx" style="padding-left: end">
			<span title="Account">{account}</span>
			<span title="Transaction ID">{txid || '--'}</span>
		</div>
		
		<div class="date-tx" title="Date">
			<span>{#if time}{time}<span>-</span>{date}{/if}</span>
		</div>
		{#if status === 'processing'}
			<button title="Cancel Transaction" on:click={cancelTx}>
				<Close width="20px" height="20px"/>
			</button>
		{/if}
	</div>
	{#if disable}
		<div class="mobile-row" transition:slide="{{delay: 250, duration: 250, easing: quintOut }}">
			<div class="mobile-account-tx" style="padding-left: end" on:click={handlerMobile}>
				<span title="Account"><b>Account:</b> {account}</span>
				<span title="Transaction ID"><b>Transaction ID:</b> {txid || '--'}</span>
			</div>
			{#if status === 'processing'}
				<button title="Cancel Transaction" on:click={cancelTx}>
					Cancel Transaction
				</button>
			{/if}
		</div>
	{/if}
</div>
