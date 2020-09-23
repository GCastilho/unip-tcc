<script>
	import * as balances from '../../../stores/balances'
	import { withdraw } from '../../../stores/transactions'
	import axios from '../../../utils/axios'

	export let name
	export let fee
	let withdrawAmount
	let err = null

	/** Impede que o valor digitado do amount seja maior que o saldo disponível */
	const filterAmount = () => withdrawAmount = withdrawAmount > $balances[name].available ? $balances[name].available : withdrawAmount

	$: amountToReceive = withdrawAmount - fee > 0 ? withdrawAmount - fee : 0

	async function handleWithdraw(event) {
		const destination = event.target.destination.value
		const amount = +event.target.amount.value

		if (amount < (fee*2)) {
			err = 'err'
			return
		}

		event.target.destination.value = ''
		event.target.amount.value = ''

		try {
			await withdraw(name, destination, amount)
			err = null

			amountToReceive = 0
		} catch(err) {
			console.error('Error on withdraw request:', err)
		}
	}
</script>

<style>
	h4 {
		font-weight: bold;
		text-align: center;
	}

	form {
		margin: auto;
		margin-top: 15px;
		margin-bottom: 15px;
		text-align: right;
		width: 85%;
	}

	button {
		border: 0;
		border-radius: 10px;
		width: 85.5625px;
		height: 45px;
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

	.withdraw-info {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
	}

	input {
		margin: 2px;
		width: 85%;
		text-align: right;
		border: 1px solid #707070
	}

	input:hover {
		border-color: #26A0DA
	}

	.err {
		border-color: red;
	}

	.err:hover {
		border-color: rgb(197, 3, 3)
	}

	small {
		display: block;
		text-align: center;
		color: red
	}

	/* Remove arrow do type number */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Remove arrow do type number no firefox */
	input[type=number] {
		-moz-appearance:textfield;
	}

	p {
		margin: 0;
	}
</style>

<form on:submit|preventDefault={handleWithdraw}>
	<h4>Withdraw {name.toUpperCase()}</h4>
	<div>
		{#if err}
			<small>The withdrawal must be at least <b>{(fee*2).toFixed(8)}</b></small>
		{/if}
		<div class="withdraw-info">
			<label for="destination">Destination:</label>
			<input type="text" id="destination" required>
		</div>
		<div class="withdraw-info">
			<label for="amount">Amount:</label>
			<input
				class={err}
				type="number" id="amount" step="0.00000001" required
				bind:value={withdrawAmount}
				on:input="{filterAmount}"
			>
		</div>
		<p>Fee: {fee.toFixed(8)}</p>
		<p>Minimum withdrawal: {(fee*2).toFixed(8)}</p>
		<p>You will receive: {amountToReceive.toFixed(8)}</p>
	</div>
	<button type="submit">Withdraw</button>
</form>
