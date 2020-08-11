<script>
	export let type
	export let status
	export let amount
	export let currency
	export let account
	export let txid
	export let timestamp

	const coin = currency === 'bitcoin' ? ' BTC': ' NANO'

	function getDate(timestamp) {
		const dateTime = new Date(timestamp)
		return dateTime.toLocaleDateString()+' '+dateTime.toLocaleTimeString()
	}
</script>

<style>
	div {
		display: flex;
		flex-direction: column;
	}
	td {
		padding-left: 10px;
	}
	tr {
		background-color: #fdf9f9;
		border-bottom: 1px solid var(--table-borders);
	}
	tr:nth-child(2n) {
		background-color: #FFF7F3;
	}
</style>

<tr>
	<div>
		<td>{type}</td>
		<td>{status}</td>
	</div>
	<td>{amount+coin}</td>
	<div>
		<td>{account}</td>
		<td>{txid || '--'}</td>
	</div>
	<td style="text-align: center">{getDate(timestamp)}</td>
</tr>
