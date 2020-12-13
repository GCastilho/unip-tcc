<script context="module">
	import balances from '../../stores/balances'

	export async function preload(page, session) {
		if (!session.loggedIn) return this.redirect(303, '/login')

		return {
			userBalances: await this.fetch(balances.apiUrl).then(res => res.json())
		}
	}
</script>

<script lang="ts">
	import currencies from '../../utils/currencies'
	import TableRow from './_tableRow/index.svelte'
	import type { Currencies } from '../currencies'

	export let userBalances: Parameters<typeof balances['init']>[0]
	balances.init(userBalances)

	const currencyEntries = Object.entries(currencies) as [
		keyof Currencies,
		Currencies[keyof Currencies]
	][]
</script>

<style>
	table {
		--table-borders: #f19e82
	}

	h1 {
		margin-top: 0.5em;
		text-align: center;
	}

	table {
		font-family: arial, sans-serif;
		border-collapse: collapse;
		border: 1px solid var(--table-borders);
		border-top: 0;
		margin: 1.5em;
		text-align: center;
		table-layout: auto; /* fixed; */
		width: 100%;
		width: -webkit-fill-available;
		width: -moz-fill-available;
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
	@media only screen and (max-width: 900px){
		table {
			margin-right: 0;
			margin-left: 0;
		}
	}
</style>

<svelte:head>
	<title>Balances page</title>
</svelte:head>

<h1>Balances</h1>
<table>
	<th>Coin</th>
	<th>Name</th>
	<th>Available Balance</th>
	<th>Locked Balance</th>
	<th>Actions</th>
	{#each currencyEntries as [currency, {code, decimals, fee}]}
		<TableRow {currency} {code} {decimals} {fee} />
	{/each}
</table>
