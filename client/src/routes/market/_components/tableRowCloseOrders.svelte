<script lang='ts'>
	import { format } from 'light-date'
	import _currencies from '../../../utils/currencies'
	import type { MarketTrade } from '../../../../../interfaces/market.d'

	export let trade: MarketTrade

	let {
		currencies,
		price,
		amount,
		fee,
		total,
		timestamp
	} = trade

	$: baseCurrencies = _currencies[currencies[0]]
	$: targetCurrencies = _currencies[currencies[1]]

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
		<!-- Mostra o par das moedas -->
		{
			baseCurrencies ? 
			baseCurrencies.code.toUpperCase() 
			: '--'
		}/{
			targetCurrencies ?
			targetCurrencies.code.toUpperCase() 
			: '--'
		}
	</td>
	<td>
		<!-- mostra o preço com o numero de casas decimais correto e o codigo correto -->
		{baseCurrencies ? 
			`${price.toFixed(baseCurrencies.decimals)} ${baseCurrencies.code.toUpperCase()}` 
			: '--'}
	</td>
	<td>
		<!-- mostra o amount com o numero de casas decimais correto e o codigo correto -->
		{targetCurrencies ? 
			`${amount.toFixed(targetCurrencies.decimals)} ${targetCurrencies.code.toUpperCase()}` 
			: '--'}
	</td>
	<!-- o valor da fee esta na unidade do requesting -->
	<td>
		<!-- mostra o fee com o numero de casas decimais correto e o codigo correto -->
		{baseCurrencies ? 
			`${fee.toFixed(baseCurrencies.decimals)} ${baseCurrencies.code.toUpperCase()}` 
			: '--'}
	</td>
	<td>
		<!-- mostra o total com o numero de casas decimais correto e o codigo correto -->
		{baseCurrencies ? 
			`${total.toFixed(baseCurrencies.decimals)} ${baseCurrencies.code.toUpperCase()}` 
			: '--'}
	</td>
	<td class="date">{time}-{date}</td>
</tr>
