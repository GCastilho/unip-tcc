<script lang='ts'>
	import trades from '../_stores/trades'
	import TableRow from './tableRowCloseOrders.svelte'

	const { synchronized } = trades

	/**
	 * Função para carregar mais transações ao chegar perto do final da página
	 */
	function handleScroll() {
		// Checa se chegou a 80% do fim da página
		if ((window.innerHeight + window.pageYOffset) >= 0.8 * document.body.offsetHeight) {
			trades.fetch()
		}
	}
</script>

<style>
	table {
		max-height: 300px;
		width: 800px;
		overflow-y: scroll;
		border: 1px solid #F0AE98;
	}
	tr:first-of-type {
		position: sticky;
		top: 0;
	}
</style>

<table on:scroll={handleScroll}>
	<tr>
		<th>Par</th>
		<th>Quantidade</th>
		<th>Preço</th>
		<th>Hora</th>
		<th>Fee</th>
		<th>Ação</th>
	</tr>
	{#each $trades as trade (trade.opid)}
		<TableRow {trade}/>
	{:else}
		<tr>
			<td colspan="6" style="text-align: center">
				{#if $synchronized}
					<h5 class="text-center">There are no close orders here.</h5>
				{:else}
					<h5 class="text-center">Loading...</h5>
				{/if}
			</td>
		</tr>
	{/each}
</table>
