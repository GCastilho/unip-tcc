<script>
	import OpenOrders from '../market/_components/openOrders.svelte'
	import CloseOrders from '../market/_components/closeOrders.svelte'

	$: tab = true
</script>

<style>
	.main {
		display: flex;
		height: calc(100vh - 3.65em);
		flex-grow: 1;
	}
	.right {
		display: flex;
		flex-direction: column;
		flex: 0.40;
	}
	.left {
		display: flex;
		flex-direction: column;
		flex: 0.70;
	}
	.order {
		display: flex;
		flex: 0.65;
		height: 100%;
		width: 100%;
		background-color: crimson;
	}
	.buy {
		display: flex;
		flex: 0.45;
		height: 100%;
		width: 100%;
		background-color: dimgray;
	}
	.graph {
		display: flex;
		flex: 0.63;
		height: 100%;
		width: 100%;
		background-color: darkgrey;
	}
	.history {
		display: flex;
		flex-direction: column;
		flex: 0.37;
		height: 100%;
		width: 100%;
	}
	.tabList {
		display: flex;
		flex-direction: row;
		border-bottom: 1px solid #CCCCCC;
		margin: 0;
		margin-bottom: 2px;
		padding: 5px;
		padding-bottom: 0;
	}
	.tabList > button {
		cursor: pointer;
		font-size: 15px;
		display: inline-block;
		padding: 0.5em 0.75em;
		outline: none;
		background-color: white;
	}
	.selected {
		border: none;
		border-bottom: 2px solid #ff7547;
		color: #eb3e00;
	}
	.notSelected {
		border: none;
		border-bottom: 2px solid transparent;
		color: #000000;
	}
	.notSelected:hover {
		color: #ff7547;
	}
	.tables {
		display: flex;
		flex-grow: 1;
	}
</style>

<div class="main">
	<div class="left">
		<div class="graph"></div>
		<div class="history">
			<div class="tabList">
				<button class={tab ? 'selected' : 'notSelected'} on:click={()=> tab = true}>Open Orders</button>
				<button class={!tab ? 'selected' : 'notSelected'} on:click={()=> tab = false}>Close Orders</button>
			</div>
			<div class="tables">
				{#if tab}
					<OpenOrders/>
				{:else}
					<CloseOrders/>
				{/if}
			</div>
		</div>
	</div>
	<div class="right">
		<div class="order">

		</div>
		<div class="buy"></div>
	</div>
</div>
