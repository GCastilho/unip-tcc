<script context="module">
	const rows = new Set()
</script>

<script>
	import QRious from 'qrious'
	import { onMount } from 'svelte'
	import { emit } from '../../websocket.js'

	export let code
	export let name
	export let balance
	export let accounts = []

	let hidden = true
	let selectedAction = ''
	let selectedAccount = ''
	let withdrawAmount

	// Qr Code stuff
	let qrious
	let canvas

	onMount(() => {
		// Seleciona a primeira account do usuário
		selectedAccount = accounts[0]

		rows.add(closeActionCell)
		return () => rows.delete(closeActionCell)
	})

	/** Atualiza o valor do qr code com o selectedAccount */
	const setQrCode = () => qrious.set({ value: `${name}:${selectedAccount}` })

	/** Fecha a aba de actions da linha atual */
	const closeActionCell = () => hidden = true

	/** Fecha as abas de actions de todas as linhas */
	const closeAllCells = () => rows.forEach(closeFunction => closeFunction())

	/** Impede que o valor digitado do amount seja maior que o saldo disponível */
	const filterAmount = () => withdrawAmount = withdrawAmount > balance ? balance : withdrawAmount

	/** Fecha todas as abas, troca o conteúdo, depois abre a atual */
	function openActionCell(cell) {
		if (!hidden && selectedAction === cell.target.name) {
			hidden = true
		} else {
			closeAllCells()
			selectedAction = cell.target.name
			hidden = false

			// Renderiza o qr code depois de montar o componente
			if (selectedAction === 'deposit') {
				setTimeout(() => {
					qrious = new QRious({
						element: canvas,
						value: `${name}:${selectedAccount}`
					})
				})
			}
		}
	}

	async function handleWithdraw(event) {
		const destination = event.target.destination.value
		const amount = event.target.amount.value

		try {
			const opid = await emit('withdraw', {
				currency: name,
				destination,
				amount
			})
			console.log('Withdraw executed, opid is:', opid)

			// Atualiza o balance
			balance -= amount
		} catch(err) {
			console.error('Error on withdraw request:', err)
		}
	}
</script>

<style>
	canvas {
		display: block;
	}

	h4 {
		font-weight: bold;
		text-align: center;
	}

	li {
		list-style-type: none;
		padding: 3px;
		cursor: pointer;
	}

	tr {
		border-bottom: 1px solid var(--table-borders);
	}

	tr:nth-child(4n), tr:nth-child(4n - 1) {
		background-color: #FFF7F3
	}

	td > button {
		background-color: transparent;
		border: 0;
		text-transform: uppercase;
		cursor: pointer;
	}

	ul {
		padding: 0;
	}

	form {
		margin: auto;
		margin-top: 15px;
		margin-bottom: 15px;
		text-align: right;
		width: 85%;
	}

	form > button {
		border: 0;
		border-radius: 10px;
		padding: 15px;
		cursor: pointer;
		background-color: #F0AE98;
	}

	form > div {
		border: 1px solid var(--table-borders);
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 5px;
		background-color: white;
	}

	form > div > input {
		margin: 2px;
		width: 85%;
		text-align: right;
	}

	/* Remove arrow do type number */
	form > div > input::-webkit-outer-spin-button,
	form > div > input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Remove arrow do type number no firefox */
	form > div > input[type=number] {
		-moz-appearance:textfield;
	}

	.action-cell {
		display: flex;
		justify-content: center;
	}

	.action-cell > * {
		margin-left: auto;
		margin-right: auto;
	}

	.action-row {
		border-top: 2px solid transparent;
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

	.list-active-item {
		border: 1px solid var(--table-borders);
		border-radius: 3px;
		background-color: white;
	}

	.name-cell {
		text-transform: capitalize;
	}

	.qr-container {
		border: 1px solid var(--table-borders);
		height: 100%;
		margin-top: 15px;
		margin-bottom: 15px;
		padding: 10px;
		border-radius: 10px;
		background-color: white;
	}
</style>

<tr>
	<td class="coin-cell">{code}</td>
	<td class="name-cell">{name}</td>
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
				<ul>
					<h4>Select deposit address</h4>
					{#each accounts as account}
						<li
							class:list-active-item="{selectedAccount === account}"
							on:click="{() => selectedAccount = account}"
							on:click="{setQrCode}"
						>{account}</li>
					{/each}
				</ul>
				<div class="qr-container">
					<canvas bind:this={canvas}></canvas>
				</div>
			{:else if selectedAction === 'withdraw'}
				<form on:submit|preventDefault={handleWithdraw}>
					<h4>Withdraw {name.toUpperCase()}</h4>
					<div>
						<label for="destination">Destination:</label>
						<input type="text" id="destination" required>
						<br/>
	
						<label for="amount">Amount:</label>
						<input
							type="number" id="amount" required
							bind:value={withdrawAmount}
							on:input="{filterAmount}"
						>
					</div>

					<button type="submit">Withdraw</button>
				</form>
			{/if}
		</div>
	</td>
</tr>
