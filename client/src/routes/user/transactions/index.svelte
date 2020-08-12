<script>
	import axios from '../../../utils/axios.js'
	import * as auth from '../../../stores/auth.js'
	import * as transactions  from '../../../stores/transactions'
	import TableCell from './tableCell.svelte'

	// Variaveis usadas para pegar a posisão do scroll
	let scrollY
	let innerHeight
	let body

	// Garante que a store de transactions tenha as últimas tx p/ mostrar na tela
	transactions.fetch()

	/**
	 * Função para carregar mais transações ao chegar ao final da pagina
	 */
	function handleScroll() {
		if ((innerHeight+scrollY) >= body.scrollHeight) {
			transactions.fetch($transactions.length + 10)
		}
	}
	
	/**
	 * Converte um timestamp para um padrão legivel
	 */
	function getDate(timestamp) {
		const dateTime = new Date(timestamp)
		return `${dateTime.toLocaleDateString()} ${dateTime.toLocaleTimeString()}`
	}
</script>

<style>
	.table {
		--table-borders: #f19e82;
		font-family: arial, sans-serif;
		border: 1px solid var(--table-borders);
		border-radius: 5px;
		border-spacing: 0;
		border-top: 0;
		border-left: 0;
		margin-right:20px;
		width: 100%;
		overflow: hidden;
	}
	.table > div:first-of-type {
		display: grid;
		grid-template-columns: 10% 13% 57% 20%;
	}
	th {
		background-color: rgba(255,62,0,0.7);
		border-left: 1px solid #f19e82;
		border-top: 0;
	}
	th:first-child {
		border-left: 0;
	}
	.background-table {
		width: calc(100vw - 100px);
		min-width: 630px;
		min-height: calc(100vh - 220px);
		border: 1px solid lightgray;
		margin-top: 1.5em;
		margin-left: 0px;
		margin-right: 20px;
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 30px;
	}
</style>

<svelte:window
	on:scroll={handleScroll}
	bind:innerHeight={innerHeight}
	bind:scrollY={scrollY}
/>

<h1>Transactions</h1>
<div class="background-table">
	<div class="table" bind:this={body}>
		<div>
			<th>Type</th>
			<th>Amount</th>
			<th>Account / Transaction ID</th>
			<th>Date</th>
		</div>
		{#each $transactions as transaction}
			<TableCell
				type={transaction.type}
				status={transaction.status}
				amount={transaction.amount}
				currency={transaction.currency}
				account={transaction.account}
				txid={transaction.txid}
				timestamp={transaction.timestamp}
			/>
		{:else}
			<tr>
				<td colspan="100%" style="border-right:none">
					<h5 class="text-center">There are no Transactions here.</h5>
				</td>
			</tr>
		{/each}
	</div>
</div>
