<script>
	import BuySell from './_buySell.svelte'
</script>

<style>
	h1 {
		margin-top: 0.5em;
		text-align: center;
	}

	.main {
		display: flex;
		height: 100%;
		width: 100%;
		flex-grow: 1;
		justify-content: center;
	}
</style>

<h1>Market</h1>

<div class="main">
	<BuySell/>
</div>
