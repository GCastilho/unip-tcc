<script lang='ts'>
	import { format } from 'light-date'

	export let order

	let {
		owning,
		requesting,
		status,
		timestamp,
		type
	} = order

	$: time = timestamp ? format(new Date(timestamp), '{HH}:{mm} ') : null
	$: date = timestamp ? format(new Date(timestamp), ' {dd}/{MM}/{yyyy}') : null
</script>
<style>
	tr {
		padding: 0;
		margin: 0;
	}
	td {
		text-align: center;
		padding: 2px 5px;
	}
</style>
<tr>
	<td>{requesting.currency || '--'}/{owning.currency || '--'}</td>
	<td>{type}</td>
	<td>{requesting.amount}</td>
	<td>{owning.amount}</td>
	<td class="date">{time}-{date}</td>
	<td>{status}</td>
</tr>
