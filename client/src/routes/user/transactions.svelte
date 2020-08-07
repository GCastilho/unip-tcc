<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import * as transactionsList  from "../../stores/transactions"

	let transactions = []

	transactionsList.subscribe(value => {transactions = value})

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
	.table_holder {
		width: calc(100vw - 100px);
		min-width: 630px;
		min-height: calc(100vh - 220px);
		border: 1px solid lightgray;
		background-color: #60606060;
		margin-top: 1.5em;
		margin-left: 0px;
		margin-right: 20px;
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 30px;
	}
	.table_holder table{
		border-collapse: collapse;
		margin-right:20px;
		width: 100%;
	}
	.table_holder table td{
		border-right: 1px solid #80808080;
	}
	.table_holder table tr{
		border-top: 1px solid #80808080;
	}

</style>

<h1>Transactions</h1>
<div class="table_holder">
<table>
	<thead>
		<tr>
			<th>opid</th>
			<th>status</th>
			<th>currency</th>
			<th>txid</th>
			<th>account</th>
			<th>amount</th>
			<th>type</th>
			<th>confirmations</th>
			<th>timestamp</th>
		</tr>
	</thead>
	<tbody>
	{#each $transactionsList as tx}
		<tr>
			<td>{tx.opid}</td>
			<td>{tx.status}</td>
			<td>{tx.currency}</td>
			<td>{tx.txid}</td>
			<td>{tx.account}</td>
			<td>{tx.amount}</td>
			<td>{tx.type}</td>
			<td>{tx.confirmations}</td>
			<td>{getDate(tx.timestamp)}</td>
		</tr>
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
