<script>
	export let transactionItem
</script>

<style>

	td{
		border-right: 1px solid #80808080;
		padding-left: 10px;
	}
	tr{
		border-top: 1px solid #80808080;
	}
</style>
<tr>
	<td>{transactionItem['opid']}</td>
	<td>{transactionItem['status']}</td>
	<td>{transactionItem['currency']}</td>
	<td>{transactionItem['txid']}</td>
	<td>{transactionItem['account']}</td>
	<td>{transactionItem['amount']}</td>
	<td>{transactionItem['type']}</td>
	<td>{transactionItem['confirmations']}</td>
	<td style="border-right:none">{transactionItem['timestamp']}</td>
</tr>
