<script>
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '@sapper/app'
	import { subscribe } from '../../stores/auth.js'
	import TableRow from './_tableRow/index.svelte'
	import axios from '../../utils/axios'

	/** Referência à subscription da store de auth */
	let unsubscribeAuth

	onMount(() => {
		// Redireciona para login caso não autenticado
		unsubscribeAuth = subscribe(auth => {
			if (!auth) goto('/login')
		})
	})

	/**
	 * retorna uma lista com os detalhes das accounts 
	 */
	async function fetchCurrenciesList() {
		const accounts = await axios.get('/v1/user/accounts')
		const currenciesDetailed = await axios.get('/v1/currencies')

		return currenciesDetailed.data.map(currency => ({
			name:     currency.name,
			code:     currency.code,
			fee:      currency.fee,
			decimals: currency.decimals,
			accounts: accounts.data[currency.name]
		}))
	}

	onDestroy(() => {
		if (typeof unsubscribeAuth === 'function') unsubscribeAuth()
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

<svelte:head>
	<title>Balances page</title>
</svelte:head>

{#await fetchCurrenciesList()}
	<h1>Fetching data...</h1>
{:then currenciesList}
	<h1>Balances</h1>
	<table>
		<th>Coin</th>
		<th>Name</th>
		<th>Available Balance</th>
		<th>Locked Balance</th>
		<th>Actions</th>
		{#each currenciesList as {code, name, fee, accounts}}
			<TableRow {code} {name} {fee} {accounts} />
		{/each}
	</table>
{:catch err}
	<h1>Error: {err}</h1>
{/await}
