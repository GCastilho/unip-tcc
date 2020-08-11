<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../../utils/axios.js"
	import * as auth from "../../../stores/auth.js"
	import * as transactions  from "../../../stores/transactions"
	import TableCell from './tableCell.svelte'

	let pages = 0

	//Variaveis usadas para pegar a poçisão do scroll
	let scrollY
	let innerHeight
	let body

	//inicia a store transactions
	transactions.loadTx()

	/**
	 * Função para carregar mais transações ao chegar ao final da pagina
	*/
	function scrollHandle() {
		if ((innerHeight+scrollY) >= body.scrollHeight) {
			transactions.reloadTx(pages += 10)
		}
	}
	
	/**
	 * Converte um timestamp para um padrão legivel
	*/
	function getDate(timestamp) {
		const dateTime = new Date(timestamp)
		return dateTime.toLocaleDateString()+' '+dateTime.toLocaleTimeString()
	}

	onMount(() => {
		// Redireciona para home caso não esteja autenticado
		if (!$auth) goto('/')
	})
</script>

<style>
	table {
		--table-borders: #f19e82;
		font-family: arial, sans-serif;
		border-collapse: collapse;
		border: 1px solid var(--table-borders);
		border-top: 0;
		border-collapse: collapse;
		margin-right:20px;
		width: 100%;
	}
	th {
		background-color: rgba(255,62,0,0.7);
		border-left: 1px solid var(--table-borders);
		border-top: 0;
	}
	div {
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
	on:scroll={() => scrollHandle()}
	bind:innerHeight={innerHeight}
	bind:scrollY={scrollY}
/>

<h1>Transactions</h1>
<div class="table_holder">
	<table bind:this={body}>
		<thead>
			<tr>
				<th>Type</th>
				<th>Amount</th>
				<th>Account / Transaction ID</th>
				<th>Date</th>
			</tr>
		</thead>
		<tbody>
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
		</tbody>
	</table>
</div>
