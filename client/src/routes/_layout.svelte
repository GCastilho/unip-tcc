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
		max-width: 100vw;
		background-color: white;
		padding: 1.5em;
		box-sizing: border-box;
	}

	@media only screen and (max-width: 900px) {
		main {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 0;
			padding-top: 1.5em;
		}
	}
</style>

<Nav {segment}/>

<main>
	<slot></slot>
</main>
