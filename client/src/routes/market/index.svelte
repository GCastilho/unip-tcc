<script></script>

<style>
	:root {
		--radio-switch-width: 186px;
		--radio-switch-height: 46px;
		--radio-switch-padding: 3px;
		--radio-switch-radius: 50em;
		--radio-switch-animation-duration: 0.3s;
	}

	h1 {
		margin-top: 0.5em;
		text-align: center;
	}

	.main {
		display: flex;
		height: 100%;
		width: 100%;
		flex-grow: 1;
		justify-content: center;
	}

	.block-1 {
		display: flex;
		flex-direction: column;
		background-color: rgb(184, 184, 190);
	}

	.float-input {
		position: relative;
		margin: 20px;
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
		border: 2px solid #3951b2;
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

	.toogle-button {
		display: flex;
		flex-direction: row;
	}

	button {
		color: white;
		background-color: #ff3e00;
		cursor: pointer;
		opacity: 1;
		height: 35px;
		width: 150px;
		border: 0;
		border-radius: 5px;
		outline: 0;
		margin: 10px;
		align-self: center;
		animation: 4s;
		animation-delay: 4s;
	}

	button:hover {
		opacity: 0.9;
	}

	button:active {
		background-color: #b52d02;
	}

	.radio-switch {
		display: inline-flex;
		padding: var(--radio-switch-padding);
		border-radius: var(--radio-switch-radius);
		border: 1px solid #d3d3d4;
	}

	.radio-switch__item {
		height: calc(var(--radio-switch-height) - 2*var(--radio-switch-padding));
		width: calc(var(--radio-switch-width)*0.5 -  var(--radio-switch-padding));
	}

	.radio-switch__label {
		display: block;
	}

	.radio-switch__input {
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
</style>

<h1>Market</h1>

<div class="main">
	<div class="block-1">
		<div class="radio-switch">
			<div class="radio-switch__item">
				<input type="radio" class="radio-switch__input" id="radio1">
				<label for="radio2" class="radio-switch__label">Buy</label>
			</div>
			<div class="radio-switch__item">
				<input type="radio" class="radio-switch__input" id="radio2">
				<label for="radio1" class="radio-switch__label">Sell</label>
			</div>
		</div>
		<div class="toogle-button">
			<button>Buy</button>
			<button>Sell</button>
		</div>
		<div class="float-input">
			<input placeholder="BTC"/>
			<label>limite price</label>
		</div>
		<div class="float-input">
			<input placeholder="BTC"/>
			<label>amount</label>
		</div>
		<div class="float-input">
			<input placeholder="BTC"/>
			<label>total</label>
		</div>
		<button>Buy BTC</button>
	</div>
</div>
