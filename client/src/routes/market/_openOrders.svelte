<script lang='ts'>
	import { onMount } from 'svelte'
	import * as openOrders from '../../stores/orderbook'
	import TableRow from './_components/tableRowOpenOrders.svelte'

	const { synchronized } = openOrders

	onMount(() => {
		if ($openOrders.length == 0) openOrders.fetch()
	})

	/**
	 * Função para carregar mais transações ao chegar perto do final da página
	 */
	function handleScroll() {
		// Checa se chegou a 80% do fim da página
		if ((window.innerHeight + window.pageYOffset) >= 0.8 * document.body.offsetHeight) {
			openOrders.fetch()
		}
	}

	console.log($openOrders)
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
		<th>Ordem</th>
		<th>Quantidade</th>
		<th>Preço</th>
		<th>Hora</th>
		<th>Ação</th>
	</tr>
	{#each $openOrders as order (order.opid)}
		<TableRow {order}/>
	{:else}
		<tr>
			<td colspan="6" style="border-right:none">
				{#if $synchronized}
					<h5 class="text-center">There are no Transactions here.</h5>
				{:else}
					<h5 class="text-center">Loading...</h5>
				{/if}
			</td>
		</tr>
	{/each}
</table>
