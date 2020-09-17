<script context="module">
	import { init } from '../stores/auth'
	import { apiServerUrl } from '../utils/axios'

	export async function preload() {
		await init(this.fetch)
	}
</script>

<script>
	import Nav from '../components/Nav.svelte'

	export let segment
</script>

<style>
	main {
		position: relative;
		max-width: 56em;
		background-color: white;
		padding: 1.5em;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>

<Nav {segment}/>

<main>
	<slot></slot>
</main>
