<script context="module">
	export function preload(page, session) {
		if (!session.loggedIn) this.redirect(303, '/login')
	}
</script>

<script>
	import * as currencies from '../../stores/currencies'
	import TableRow from './_tableRow/index.svelte'
</script>

<style>
	table {
		--table-borders: #f19e82
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

<h1>Balances</h1>
<table>
	<th>Coin</th>
	<th>Name</th>
	<th>Available Balance</th>
	<th>Locked Balance</th>
	<th>Actions</th>
	{#each $currencies as {code, name, decimals, fee}}
		<TableRow {code} currency={name} {decimals} {fee} />
	{/each}
</table>
