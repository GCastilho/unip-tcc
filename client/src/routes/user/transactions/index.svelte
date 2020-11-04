<script>
	import { onMount } from 'svelte'
	import * as transactions from '../../../stores/transactions'
	import TableCell from './_tableCell.svelte'

	const { synchronized } = transactions

	onMount(() => {
		if ($transactions.length == 0) transactions.fetch()
	})

	/**
	 * Função para carregar mais transações ao chegar perto do final da página
	 */
	function handleScroll() {
		// Checa se chegou a 80% do fim da página
		if ((window.innerHeight + window.pageYOffset) >= 0.8 * document.body.offsetHeight) {
			transactions.fetch()
		}
	}
</script>

<style>
	.table {
		--table-borders: #f19e82;
		font-family: arial, sans-serif;
		border: 1px solid var(--table-borders);
		border-radius: 5px;
		border-spacing: 0;
		border-right: 0;
		border-left: 0;
		margin-right:20px;
		width: 100%;
		overflow: hidden;
	}

	h1 {
		margin-top: 0.5em;
		text-align: center;
	}

	.table > div:first-of-type {
		display: grid;
		grid-template-columns: 10% 13% 59% 18%;
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
		width: 100%;
		width: -webkit-fill-available;
		width: -moz-fill-available;
		min-height: calc(100vh - 220px);
		border: 1px solid lightgray;
		margin: 1.5em;
		margin-bottom: 0px;
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 30px;
	}

	@media only screen and (max-width: 900px){
		.background-table{
			width: 100%;
			margin-right: 0;
			margin-left: 0;
			padding: 0;
			border-radius: 0;
		}
		h1 {
			margin: 0;
		}
		.table {
			border-top: 0;
			border-radius: 0;
		}
		.table > div:first-of-type {
			display: none;
			grid-template-columns: 10% 13% 59% 18%;
		}
	}
</style>

<svelte:window on:scroll={handleScroll} />

<h1>Transactions</h1>
<div class="background-table">
	<div class="table">
		<div>
			<th>Type</th>
			<th>Amount / Fee</th>
			<th>Account / Transaction ID</th>
			<th>Date</th>
		</div>
		{#each $transactions as transaction (transaction.opid)}
			<TableCell transaction={transaction}/>
		{:else}
			<tr>
				<td colspan="4" style="border-right:none">
					{#if $synchronized}
						<h5 class="text-center">There are no Transactions here.</h5>
					{:else}
						<h5 class="text-center">Loading...</h5>
					{/if}
				</td>
			</tr>
		{/each}
	</div>
</div>
