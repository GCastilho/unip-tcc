<script>
	import { stores } from '@sapper/app'
	import { init } from '../stores/auth'
	import Nav from '../components/Nav.svelte'

	// Inicializa a store de autenticação
	const { session } = stores()
	init(session)

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
