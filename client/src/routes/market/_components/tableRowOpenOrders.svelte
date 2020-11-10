<script lang='ts'>
	import { format } from 'light-date'
	import * as currencies from './../../../stores/currencies'

	export let order

	let {
		owning,
		requesting,
		status,
		timestamp,
		type
	} = order

	// Busca os dados da cunrrency usadas
	$: owningCurrency = $currencies.find(value => owning.currency === value.name)
	$: requestingCurrency = $currencies.find(value => requesting.currency === value.name)

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
	<td>{type}</td>
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
	<td>{status}</td>
</tr>
