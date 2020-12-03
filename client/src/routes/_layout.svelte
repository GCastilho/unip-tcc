<script lang="ts" context="module">
	import { init as initCurrencies } from '../utils/currencies'

	/*
	 * Código javascript está sendo executado antes dessa função retornar, o que
	 * é um problema e eu acho que é um bug no sapper, pq embora ele falem que
	 * nada é _renderizado_ antes dela funcionar (não é o caso), é
	 * contra-intiuítivo códigos como MÓDULOS serem executados antes dela retornar
	 * 
	 * No caso as funções de emptyStore que dependem desse módulo podem retornar
	 * um objeto vazio, portanto inválido, caso ele seja carregado antes do
	 * preload ter terminado, o que acontece qdo vc abre diretamente em uma página
	 * que o carrega
	 * 
	 * Ex: Abrir a pg ade balances faz a store de balances/accounts ser executada
	 * antes do preload terminar
	 */
	export async function preload() {
		const res = await this.fetch('/currencies')
		initCurrencies(await res.json())
	}
</script>

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
