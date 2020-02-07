<script>
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '@sapper/app'
	import TableRow from './_tableRow.svelte'
	import * as auth from '../../stores/auth.js'
	import * as socket from '../../websocket.js'

	onMount(async () => {
		// Redireciona para login caso não autenticado
		// if (!$auth) goto('/login')

		// remove
		setTimeout(async () => {
			const sessionID = document.cookie.replace(/(?:(?:^|.*;\s*)sessionID\s*=\s*([^;]*).*$)|^.*$/, "$1")
			await auth.authenticate(sessionID)
			socket.route('/balances')
		}, 1000);
	})

	function list() {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				let list
				try {
					await socket.emit('list')
				} catch(err) {
					list = err
				}
				console.log('list:', list)
				resolve(list)
			}, 2000);
		})
	}

	onDestroy(() => {

	})
</script>

<style>
	table {
		--table-borders: #FF3E00
	}

	h1 {
		text-align: center;
	}

	table {
		font-family: arial, sans-serif;
		border-collapse: collapse;
		border: 1px solid var(--table-borders);
		border-top: 0;
		text-align: center;
		table-layout: auto; /* fixed; */
		width: 100%;
		font-size: 15px;
	}

	th {
		background-color: rgba(255,62,0,0.7);
		border-left: 1px solid #F0AE98;
		border-top: 0;
	}

	th:first-child {
		border-left: 0;
	}
</style>

{#await list()}
	<h1>Fetching data...</h1>
{:then currenciesList}
	<h1>Balances</h1>
	<table>
		<th>Coin</th>
		<th>Name</th>
		<!-- <th>accounts</th> -->
		<th>Balance</th>
		<th>Actions</th>
		{#each currenciesList as {code, name, balance}}
			<TableRow {code} {name} {balance} />
		{/each}
	</table>
{:catch err}
	<h2>Error: {err}</h2>
{/await}
