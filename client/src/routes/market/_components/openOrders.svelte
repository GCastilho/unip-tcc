<script lang='ts'>
	import openOrders from '../_stores/orderbook'
	import TableRow from './tableRowOpenOrders.svelte'

	const { synchronized } = openOrders

	/**
	 * Função para carregar mais transações ao chegar perto do final da página
	 */
	function handleScroll() {
		// Checa se chegou a 80% do fim da página
		if ((window.innerHeight + window.pageYOffset) >= 0.8 * document.body.offsetHeight) {
			openOrders.fetch()
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
	</tr>
	{#each $openOrders as order (order.opid)}
		<TableRow {order}/>
	{:else}
		<!-- Está mostrando Loading caso o usuário não esteja logado -->
		<tr>
			<td colspan="6" style="text-align: center">
				{#if $synchronized}
					<h5 class="text-center">There are no open orders here.</h5>
				{:else}
					<h5 class="text-center">Loading...</h5>
				{/if}
			</td>
		</tr>
	{/each}
</table>
