<script lang='ts'>
	import { format } from 'light-date'
	import currencies from './../../../utils/currencies'
	import * as orderbook from '../_stores/orderbook'
	import type { MarketOrder } from '../../../../../interfaces/market.d'

	export let order: MarketOrder

	let {
		opid,
		owning,
		requesting,
		timestamp
	} = order

	// Busca os dados da currency usadas
	$: owningCurrency = currencies[currencies[0]]
	$: requestingCurrency = currencies[currencies[1]]

	$: time = timestamp ? format(new Date(timestamp), '{HH}:{mm} ') : null
	$: date = timestamp ? format(new Date(timestamp), ' {dd}/{MM}/{yyyy}') : null

	function cancelOrder() {
		// O erro é ignorado pq não vamos mostrar msg de erro pro usuário AINDA
		orderbook.remove(opid).catch(err => err)
	}
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
	<td>
		<!-- owning/requesting -->
		{
			owningCurrency ? 
			owningCurrency.code.toUpperCase() 
			: '--'
		}/{
			requestingCurrency ?
			requestingCurrency.code.toUpperCase() 
			: '--'
		}
	</td>
	<td>
		<!-- mostra o amount com o numero de casas decimais correto -->
		{requesting ? 
			`${requesting.amount.toFixed(requestingCurrency.decimals)} ${requestingCurrency.code.toUpperCase()}` 
			: '--'}
	</td>
	<td>
		<!-- mostra o amount com o numero de casas decimais correto -->
		{owning ? 
			`${owning.amount.toFixed(owningCurrency.decimals)} ${owningCurrency.code.toUpperCase()}` 
			: '--'}
	</td>
	<td class="date">{time}-{date}</td>
	<td><button on:click={cancelOrder}>cancel</button></td>
</tr>
