<script>
	import axios from '../../../utils/axios.js'
	import * as auth from '../../../stores/auth.js'
	import * as transactions from '../../../stores/transactions'
	import TableCell from './_tableCell.svelte'

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
		width: calc(100vw - 100px);
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

	@media only screen and (max-width: 900px){
		.table {
			border-top: 0;
		}

		.table > div:first-of-type {
			display: none;
			grid-template-columns: auto;
			grid-template-rows: auto auto auto auto;
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
		{#each $transactions as transaction}
			<TableCell
				type={transaction.type}
				status={transaction.status}
				amount={transaction.amount}
				currency={transaction.currency}
				account={transaction.account}
				confirmations={transaction.confirmations}
				fee={transaction.fee}
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
