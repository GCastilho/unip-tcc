<script>
	export let type = 'submit'
</script>

<style>
	button {
		display: block;
		width: 100%;
		border-radius: 4px;
		border: none;
		background-color: #ff3e00;
		color: #ffffff;
		text-transform: uppercase;
		height: 50px;
		line-height: 50px;
		font-size: 14px;
		letter-spacing: .13em;
		text-align: center;
		margin-bottom: 5px;
	}
</style>

<button {type} on:click>
	<slot>Submit</slot>
</button>
