<script context="module">
	import { init } from '../stores/auth'
	import { apiServerUrl } from '../utils/axios'

	export async function preload() {
		try {
			const res = await this.fetch(`${apiServerUrl}/v1/user/authentication`, {
				method: 'GET',
				credentials: 'include'
			})
			if (res.ok) {
				const { token } = await res.json()
				await init(token)
			}
		} catch (err) {
			console.error('Error fetching credentials in preload function:', err.code)
		}
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
