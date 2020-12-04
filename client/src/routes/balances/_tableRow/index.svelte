<script lang="ts" context="module">
	/** Set com referência a todas as rows da tabela dessa currency */
	const rows = new Set<() => void>()
</script>

<script lang="ts">
	import { onMount } from 'svelte'
	import * as balances from '../../../stores/balances'
	import DepositCell from './depositCell.svelte'
	import WithdrawCell from './withdrawCell.svelte'
	import type { Currencies } from '../../currencies'

	export let currency: keyof Currencies
	export let code: Currencies[keyof Currencies]['code']
	export let decimals: Currencies[keyof Currencies]['decimals']
	export let fee: Currencies[keyof Currencies]['fee']

	let hidden = true
	let selectedAction = ''

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
		if (!hidden && selectedAction === cell) {
			hidden = true
		} else {
			closeAllCells()
			selectedAction = cell
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

	.action-row {
		border-top: 2px solid transparent;
	}

	button {
		background-color: transparent;
		border: 0;
		text-transform: uppercase;
		cursor: pointer;
	}

	div {
		display: flex;
		justify-content: center;
	}

	.balance-cell {
		/* Mantém as casas decimais alinhadas */
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
	<td class="name-cell">{currency}</td>
	<td class="balance-cell">{
		$balances[currency] // pode ser undefined pcausa de um bug no preload/store
			? $balances[currency].available.toFixed(decimals)
			: 'Loading...'
		}
	</td>
	<td class="balance-cell">{
		$balances[currency]
			? $balances[currency].locked.toFixed(decimals)
			: 'Loading...'
		}
	</td>
	<td>
		<button on:click="{() => openActionCell('deposit')}">Deposit</button>
		<button on:click="{() => openActionCell('withdraw')}">Withdraw</button>
	</td>
</tr>
<tr class="action-row" class:hidden>
	<td colspan="5">
		<div>
			{#if selectedAction === 'deposit'}
				<DepositCell {currency} />
			{:else if selectedAction === 'withdraw'}
				<WithdrawCell {currency} {fee} {decimals} />
			{/if}
		</div>
	</td>
</tr>
