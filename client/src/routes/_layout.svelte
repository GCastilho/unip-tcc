<script lang="ts" context="module">
	import { init, resourceUrl } from '../utils/currencies'

	export async function preload() {
		return {
			currencies: await this.fetch(resourceUrl).then(res => res.json())
		}
	}
</script>

<script lang="ts">
	import { stores } from '@sapper/app'
	import { init as initAuth } from '../stores/auth'
	import Nav from '../components/Nav.svelte'
	import type { Currencies } from './currencies'

	export let segment
	export let currencies: Currencies

	// Inicializa o módulo de currencies
	init(currencies)

	// Inicializa a store de autenticação
	const { session } = stores()
	initAuth(session)
</script>

<style>
	main {
		position: relative;
		max-width: 100vw;
		background-color: white;
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
