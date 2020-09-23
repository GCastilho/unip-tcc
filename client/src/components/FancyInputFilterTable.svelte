<script>
	export let id
	export let type = 'text'
	export let placeholder = ' '
	export let required = true
	export let value = ''

	const handleInput = e => {
    // in here, you can switch on type and implement
    // whatever behaviour you need
    value = type.match(/^(number|range)$/)
      ? +e.target.value
      : e.target.value;
  };

</script>

<style>
	div {
		position: relative;
		padding-top: 0;
		padding-bottom: 0;
	}

	div, label {
		padding-left: 0;
		padding-right: 0;
	}

	input {
		border: 0;
		border-bottom: 2px solid lightgrey;
		outline: none;
		min-width: 180px;
		width: 100%;
		font-size: 16px;
		transition: all .3s ease-out;
		-webkit-transition: all .3s ease-out;
		-moz-transition: all .3s ease-out;
		-webkit-appearance:none;
		border-radius:0;
	}

	input:focus {
		border-bottom: 2px solid #3951b2;
	}

	input::placeholder {
		color: transparent;
	}
	
	input:focus:required:invalid {
		border-bottom: 2px solid red;
	}

	label {
		pointer-events: none;
		position: absolute;
		top: 0;
		left: 0;
		margin-top: 0px;
		transition: all .3s ease-out;
		-webkit-transition: all .3s ease-out;
		-moz-transition: all .3s ease-out;
	}

	input:focus + label,
	input:not(:placeholder-shown) + label {
		font-size: 13px;
		margin-top: -16px;
		color: #3951b2;
	}
</style>

<div>
	<input {type} {id} {value} name={id} {required} {placeholder} on:input={handleInput} />
	<label for={id}>
		<slot>empty label</slot>
	</label>
</div>
