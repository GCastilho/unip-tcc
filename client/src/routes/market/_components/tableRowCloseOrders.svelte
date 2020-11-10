<script lang='ts'>
	import { format } from 'light-date'
	import type { MarketTrade } from '../../../../../interfaces/market.d'

	export let trade: MarketTrade

	let {
		status, // É sempre closed, essa prop não é mais usada (bota closed)
		maker,
		taker,
		price,
		timestamp,
		orderedPair
	} = trade

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
	<td>{maker}</td>
	<td>{status}</td>
	<td>{taker}</td>
	<td>{price}</td>
	<td class="date">{time}-{date}</td>
	<td>{status}</td>
</tr>
