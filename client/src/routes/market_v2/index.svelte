<script>
	
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
		flex: 0.37;
		height: 100%;
		width: 100%;
		background-color: darkslategray;
	}
</style>

<div class="main">
	<div class="left">
		<div class="graph"></div>
		<div class="history"></div>
	</div>
	<div class="right">
		<div class="order">

		</div>
		<div class="buy"></div>
	</div>
</div>
