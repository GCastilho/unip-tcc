<script lang='ts'>
	import * as balances from './../../stores/balances'
	import * as orderbook from '../../stores/orderbook'
	import type { SuportedCurrencies } from '../../../../src/libs/currencies'

	// base
	export let baseCurrency: { name: string, code: string, decimals: number }
	// target
	export let targetCurrency: { name: string, code: string, decimals: number }

	/** Eleva o preço atual a -1 */
	export function switchPrice() {
		limitPrice = Math.pow(limitPrice, -1)
	}

	/** A operação requisitada pelo cliente */
	let operation: 'buy'|'sell' = 'buy'

	/** saldo da currency base */
	$: baseBalance = $balances[baseCurrency?.name]?.available.toFixed(baseCurrency?.decimals)

	/** saldo da currency base */
	$: targetBalance = $balances[targetCurrency?.name]?.available.toFixed(targetCurrency?.decimals)

	/**
	 * a quantidade que esta na marketOrder
	 * 
	 * purchase/sale quantity
	 */
	let amount: number

	/** o preço limite para a operaçao de compra ou venda da moeda */
	let limitPrice: number

	/** o codigo moeda que esta em limit Price */
	$: priceCurrency = baseCurrency?.code.toUpperCase()

	/** o codigo da moeda que esta em operação */
	$: opCurrencyCode = targetCurrency?.code.toUpperCase()

	/**
	 * se o botao de executar operaçao esta ativo ou nao
	 * 
	 * botao desativado = true
	 * 
	 * botao ativado = false
	 */
	$: disableButton = priceCurrency === opCurrencyCode || !baseCurrency || !targetCurrency

	/** define a cor dos botões que apareceram na pagina de market */
	$: buttonColor = operation == 'sell' ? '#de4949' : '#6ec79e'

	async function trade() {
		if (disableButton) return
		const [apiBaseCurrency] = [baseCurrency?.name, targetCurrency?.name].sort()

		console.log('requesting type:', operation)

		const base = {
			currency: baseCurrency?.name as SuportedCurrencies,
			amount: baseCurrency?.name == apiBaseCurrency ? limitPrice * amount : amount / limitPrice
		}
		const target = {
			currency: targetCurrency?.name as SuportedCurrencies,
			amount: amount
		}

		await orderbook.add({
			owning: operation == 'buy' ? base : target,
			requesting: operation == 'sell' ? base : target
		})

		amount = 0
		limitPrice = 0
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
		height: 458px;
		width: 277px;
		padding: 20px;
		flex-direction: column;
		border: 1.5px solid #F0AE98;
		border-radius: 5px;
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
		border: 1px solid #F0AE98;
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
		color: #F0AE98;
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
	<slot></slot>
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
		<p>{baseCurrency ? baseCurrency.name : '...'}:</p>
		<p>{baseBalance || '...'}</p>
	</div>
	<div class="balance">
		<p>{targetCurrency ? targetCurrency.name : '...'}:</p>
		<p>{targetBalance || '...'}</p>
	</div>

	<!-- Input do amount -->
	<div class="float-input">
		<input
			type="number"
			id="quantity"
			placeholder={opCurrencyCode || '...'}
			step="0.00000001"
			bind:value={amount}
		/>
		<label for="quantity">{operation == 'buy' ? 'Purchase' : 'Sale'} quantity</label>
	</div>

	<!-- Input do preço -->
	<div class="float-input">
		<input
			type="number"
			id="Limit-price"
			placeholder={priceCurrency || '...'}
			step="0.00000001"
			bind:value={limitPrice}
		/>
		<label for="Limit-price">Limit price</label>
	</div>

	<div class="balance">
		<p>market price:</p>
		<p>000000 {priceCurrency || '...'}</p>
	</div>
	<div class="balance">
		<p>fee:</p>
		<p>000000 {priceCurrency || '...'}</p>
	</div>
	<div class="balance">
		<p>total:</p>
		<p>{(limitPrice * amount) || 0} {priceCurrency || '...'}</p>
	</div>
	<button on:click={trade} disabled={disableButton}>{operation} {opCurrencyCode || '...'}</button>
</div>
