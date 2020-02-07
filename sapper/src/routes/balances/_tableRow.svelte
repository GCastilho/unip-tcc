<script context="module">
	const rows = new Set()
</script>

<script>
	import { onMount } from 'svelte'

	export let code
	export let name
	export let balance

	let selectedAction = ''
	let hidden = true

	onMount(() => {
		rows.add(closeActionCell)

		return () => rows.delete(closeActionCell)
	})

	/** Fecha a aba de actions da linha atual */
	const closeActionCell = () => hidden = true

	/** Fecha as abas de actions de todas as linhas */
	const closeAllCells = () => rows.forEach(closeFunction => closeFunction())

	/** Fecha todas as abas, troca o conteúdo, depois abre a atual */
	function openActionCell(cell) {
		if (!hidden && selectedAction === cell.target.name) {
			hidden = true
		} else {
			closeAllCells()
			selectedAction = cell.target.name
			hidden = false
		}
	}
</script>

<style>
	tr {
		border-bottom: 1px solid var(--table-borders);
	}

	tr:nth-child(4n), tr:nth-child(4n - 1) {
		background-color: #FFF7F3
	}

	button {
		background-color: transparent;
		border: 0;
		text-transform: uppercase;
		cursor: pointer;
	}

	.action-row {
		border-top: 2px solid transparent;
	}

	.action-cell {
		height: 100px;
		border: 1px solid red;
	}

	.balance-cell {
		/* Mantém as cadas decimais alinhadas */
		text-align: right;
	}

	.coin-cell {
		text-transform: uppercase;
	}

	.hidden {
		display: none;
	}

	.name-cell {
		text-transform: capitalize;
	}
</style>

<tr>
	<td class="coin-cell">{code}</td>
	<td class="name-cell">{name}</td>
	<!-- <td>{accounts}</td> -->
	<td class="balance-cell">{balance}</td>
	<td>
		<button name="deposit" on:click={openActionCell}>Deposit</button>
		<button name="withdraw" on:click={openActionCell}>Withdraw</button>
	</td>
</tr>
<tr class="action-row" class:hidden>
	<td colspan="4">
		<div class="action-cell">
			{#if selectedAction === 'deposit'}
				deposit
			{:else if selectedAction === 'withdraw'}
				withdraw
			{/if}
		</div>
	</td>
</tr>
