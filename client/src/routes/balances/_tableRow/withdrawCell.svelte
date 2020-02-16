<script>
	import { emit } from '../../../websocket.js'
	import * as balances from '../../../stores/balances.js'

	export let name
	let withdrawAmount

	/** Impede que o valor digitado do amount seja maior que o saldo disponível */
	const filterAmount = () => withdrawAmount = withdrawAmount > $balances[name].available ? $balances[name].available : withdrawAmount

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
			$balances[name].available -= amount
			$balances[name].locked += amount
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
		padding: 15px;
		cursor: pointer;
		background-color: #F0AE98;
	}

	div {
		border: 1px solid var(--table-borders);
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 5px;
		background-color: white;
	}

	input {
		margin: 2px;
		width: 85%;
		text-align: right;
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
</style>

<form on:submit|preventDefault={handleWithdraw}>
	<h4>Withdraw {name.toUpperCase()}</h4>
	<div>
		<label for="destination">Destination:</label>
		<input type="text" id="destination" required>
		<br/>

		<label for="amount">Amount:</label>
		<input
			type="number" id="amount" step="0.00000001" required
			bind:value={withdrawAmount}
			on:input="{filterAmount}"
		>
	</div>

	<button type="submit">Withdraw</button>
</form>
