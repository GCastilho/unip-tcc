<script lang="ts">
	import * as balances from './../../stores/balances.js'
	import { orderbook } from '../../stores/market'

	// base
	export let sellingCurrency: { name: string, code: string, decimals: number }
	// target
	export let wantedCurrency: { name: string, code: string, decimals: number }

	let operation: 'buy'|'sell' = 'buy'
	let buttonColor: string = '#6ec79e'
	let disableButton: boolean


	let sellingCode, wantedCode, sellingName, wantedName

	let sellingBalance, wantedBalance

	let quantity, limitPrice

	$: {
		sellingCode = sellingCurrency ? sellingCurrency.code : null
		wantedCode = wantedCurrency ? wantedCurrency.code : null
		sellingName = sellingCurrency ? sellingCurrency.name : null
		wantedName = wantedCurrency ? wantedCurrency.name : null
	}

	$: {
		sellingBalance = $balances[sellingName] ?
			$balances[sellingName].available.toFixed(sellingCurrency.decimals)
			: null
		wantedBalance = $balances[wantedName] ?
			$balances[wantedName].available.toFixed(wantedCurrency.decimals)
			: null
	}

	$: disableButton = sellingCode === wantedCode || !sellingCurrency || !wantedCurrency ? true : false
	$: buttonColor = operation == 'sell' ? '#de4949' : '#6ec79e'

	function _trade() {
		if (disableButton) return
		const [base] = [sellingName, wantedName].sort()
		const operation = base == sellingName ? 'buy' : 'sell'

		if(operation == 'buy') {
			orderbook({
				owning: {
					currency: sellingName,
					amount: sellingName == base ? limitPrice * quantity : quantity / limitPrice
				},
				requesting: {
					currency: wantedName,
					amount: quantity
				}
			})
		} else {
			orderbook({
				owning: {
					currency: wantedName,
					amount: +limitPrice * +quantity
				},
				requesting: {
					currency: sellingName,
					amount: +limitPrice
				}
			})
		}
	}

	function trade() {
		if (disableButton) return
		const [base] = [sellingName, wantedName].sort()

		// limitPrice, quantity -> requesting

		
		if(operation == 'buy') {
			orderbook({
				owning: {
					currency: sellingName,
					amount: sellingName == base ? limitPrice * quantity : quantity / limitPrice
				},
				requesting: {
					currency: wantedName,
					amount: quantity
				}
			})
		} else {
			orderbook({
				owning: {
					currency: sellingName,
					amount: +limitPrice * +quantity
				},
				requesting: {
					currency: wantedName,
					amount: +limitPrice
				}
			})
		}
	}
</script>

<style>
	:root {
		--radio-switch-width: 208px;
		--radio-switch-height: 46px;
		--radio-switch-padding: 3px;
		--radio-switch-radius: 50em;
		--shadow-md: 0 0.9px 1.5px rgba(0, 0, 0, 0.03), 0 3.1px 5.5px rgba(0, 0, 0, 0.08), 0 14px 25px rgba(0, 0, 0, 0.12);
		--radio-switch-animation-duration: 0.3s;
	}

	.block-1 {
		display: flex;
		padding: 20px;
		flex-direction: column;
		background-color: rgb(184, 184, 190);
	}

	.radio-switch {
		position: relative;
		display: flex;
		width: fit-content;
		align-self: center;
		padding: var(--radio-switch-padding);
		margin: 5px 0 20px 0;
		border-radius: calc(var(--radio-switch-radius) * 1.4);
		background-color: #f2f2f2;
	}

	.radio-switch:focus-within, .radio-switch:active {
		box-shadow: 0 0 0 2px #d3d3d4;
	}

	.radio-switch-item {
		position: relative;
		display: inline-block;
		height: calc(var(--radio-switch-height) - 2*var(--radio-switch-padding));
		width: calc(var(--radio-switch-width)*0.5 - var(--radio-switch-padding));
	}

	.radio-switch-label {
		position: relative;
		z-index: 2;
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		border-radius: var(--radio-switch-radius);
		cursor: pointer;
		font-size: calc(((1em / 1.2) / 1.2) * 1.2);
		user-select: none;
		transition: all var(--radio-switch-animation-duration);
	}

	.radio-switch-input:checked ~ .radio-switch-label {
		color: white;
	}

	.radio-switch-input {
		position: absolute;
		clip: rect(1px, 1px, 1px, 1px);
		clip-path: inset(50%);
		width: 1px;
		height: 1px;
		overflow: hidden;
		padding: 0;
		border: 0;
		white-space: nowrap;
	}

	.radio-switch-input:focus ~ .radio-switch-label {
		background-color: 56.0784313725%;
	}

	.radio-switch-marker {
		position: absolute;
		z-index: 1;
		top: 0;
		left: -100%;
		border-radius: var(--radio-switch-radius);
		background-color: var(--button-color);
		height: 100%;
		width: 100%;
		box-shadow: var(--shadow-md);
		transition: transform var(--radio-switch-animation-duration);
	}

	.radio-switch-input:checked ~ .radio-switch-marker {
		transform: translateX(100%);
	}

	.float-input {
		position: relative;
		margin: 10px 20px;
	}

	.float-input > input {
		border: 1px solid lightgrey;
		border-radius: 5px;
		outline: none;
		min-width: 100%;
		min-width: -webkit-fill-available;
		min-width: -moz-fill-available;
		padding: 15px 20px;
		font-size: 16px;
		transition: all .1s linear;
		-webkit-transition: all .1s linear;
		-moz-transition: all .1s linear;
		-webkit-appearance:none;
	}

	.float-input > input:focus {
		border: 1px solid #3951b2;
	}

	.float-input > input::placeholder {
		text-align: end;
	}

	.float-input > label{
		pointer-events: none;
		position: absolute;
		top: calc(50% - 18px);
		left: 15px;
		transition: all .1s linear;
		-webkit-transition: all .1s linear;
		-moz-transition: all .1s linear;
		background-color: white;
		padding: 5px;
		box-sizing: border-box;
	}

	.float-input > input:focus + label,
	.float-input > input:not(:placeholder-shown) + label{
		font-size: 13px;
		top: -17px;
		padding: 0 3px;
		color: #3951b2;
		background-color: transparent;
	}

	.balance {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding: 0px 20px;
	}

	.balance > p {
		margin: 0;
	}

	button {
		color: white;
		background-color: var(--button-color);
		cursor: pointer;
		height: 35px;
		width: 150px;
		border: 0;
		border-radius: 5px;
		outline: 0;
		margin: 10px;
		align-self: center;
		animation: 4s;
		animation-delay: 4s;
		text-transform: capitalize;
	}

	button:hover {
		filter: brightness(93%);
	}

	button:active {
		filter: brightness(85%);
	}

	button:disabled {
		filter: opacity(0.5);
		cursor: not-allowed;
	}

</style>

<div class="block-1" style={`--button-color: ${buttonColor}`}>
	<div class="radio-switch">
		<div class="radio-switch-item">
			<input type="radio" class="radio-switch-input" bind:group={operation} value="buy" id="buy">
			<label for="buy" class="radio-switch-label">Buy</label>
		</div>
		<div class="radio-switch-item">
			<input type="radio" class="radio-switch-input" bind:group={operation} value="sell" id="sell">
			<label for="sell" class="radio-switch-label">Sell</label>
			<div aria-hidden="true" class="radio-switch-marker"></div>
		</div>
	</div>
	<div class="balance">
		<p>{sellingName || '...'}:</p>
		<p>{sellingBalance || '...'}</p>
	</div>
	<div class="balance">
		<p>{wantedName || '...'}:</p>
		<p>{wantedBalance || '...'}</p>
	</div>

	<div class="float-input">
		<input
			type="number"
			placeholder={wantedCode || '...'}
			step="0.00000001"
			bind:value={quantity}
		/>
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>{operation == 'buy' ? 'Purchase' : 'Sale'} quantity</label>
	</div>
	<div class="float-input">
		<input
			type="number"
			placeholder={sellingCode || '...'}
			step="0.00000001"
			bind:value={limitPrice}
		/>
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label>Limit price</label>
	</div>
	<div class="balance">
		<p>market:</p>
		<p>000000 {(operation == 'buy' ? sellingCode : wantedCode) || '...'}</p>
	</div>
	<div class="balance">
		<p>fee:</p>
		<p>000000 {(operation == 'buy' ? sellingCode : wantedCode) || '...'}</p>
	</div>
	<div class="balance">
		<p>total:</p>
		<p>000000 {(operation == 'buy' ? sellingCode : wantedCode) || '...'}</p>
	</div>
	<button on:click={trade} disabled={disableButton}>{operation} {wantedCode || '...'}</button>
</div>
