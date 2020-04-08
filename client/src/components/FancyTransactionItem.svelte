<script>
	export let transactionItem

</script>

<style>

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
	<td>{transactionItem['timestamp']}</td>
</tr>

