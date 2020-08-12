<script>
	export let type
	export let status
	export let amount
	export let currency
	export let account
	export let txid
	export let timestamp

	const coin = currency === 'bitcoin' ? ' BTC': ' NANO'
	const txColor = status === 'confirmed' ? 'green' : '#c2c21c'

	function getDate(timestamp) {
		const dateTime = new Date(timestamp)
		return dateTime.toLocaleDateString()+' '+dateTime.toLocaleTimeString()
	}
</script>

<style>
	.table-row {
		display: grid;
		grid-template-columns: 10% 13% 57% 20%;
		overflow: visible;
		background-color: #fdf9f9;
		border-bottom: 1px solid var(--table-borders);
	}
	.table-row:nth-child(2n) {
		background-color: #FFF7F3;
	}
	.table-row:last-of-type{
		border-bottom: 0;
	}
	.table-row > div {
		display: flex;
		flex-direction: column;
		padding-left: 10px;
	}
	.status-tx {
		border-left: 3px solid var(--txColor)
	}
	.status-tx > div:last-child {
		color: var(--txColor);
	}
</style>

<div class="table-row">
	<div class="status-tx" style="--txColor:{txColor}">
		<div>{type}</div>
		<div>{status}</div>
	</div>
	<div>{amount+coin}</div>
	<div>
		<div>{account}</div>
		<div>{txid || '--'}</div>
	</div>
	<div style="text-align: center">{getDate(timestamp)}</div>
</div>
