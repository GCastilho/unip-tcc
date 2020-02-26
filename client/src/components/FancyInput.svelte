<script>
	export let id
	export let type = 'text'
	export let placeholder = ' '
	export let required = true
</script>

<style>
	div {
		position: relative;
		padding-top: 15px;
		padding-bottom: 15px;
	}

	div, label {
		padding-left: 5px;
		padding-right: 5px;
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
		margin-top: 13px;
		transition: all .3s ease-out;
		-webkit-transition: all .3s ease-out;
		-moz-transition: all .3s ease-out;
	}

	input:focus + label,
	input:not(:placeholder-shown) + label {
		font-size: 13px;
		margin-top: 0;
		color: #3951b2;
	}
</style>

<div>
	<input {type} {id} name={id} {required} {placeholder} />
	<label for={id}>
		<slot>empty label</slot>
	</label>
</div>
