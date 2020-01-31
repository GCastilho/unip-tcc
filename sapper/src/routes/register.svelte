<script>
	import FancyInput from '../components/FancyInput.svelte'
	import FancyButton from '../components/FancyButton.svelte'

	function handleSubmit(event) {
		console.log(event.target.email.value)
		console.log(event.target.password.value)
		console.log(event.target.conf_password.value)
	}
</script>

<style>
	h1 {
		text-align: center;
	}

	form {
		width: 350px;
		height: 100%;
		border: 1px solid lightgray;
		margin-top: 1.5em;
		margin-left: auto;
		margin-right: auto;
		padding: 20px;
		border-radius: 6px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 50px;
	}
</style>

<h1>Register</h1>

<form on:submit|preventDefault={handleSubmit}>
	<FancyInput id="email" type="email">Email</FancyInput>
	<FancyInput id="password" type="password">Password</FancyInput>
	<FancyInput id="conf_password" type="password">Confirm password</FancyInput>

	<FancyButton type="submit">Register</FancyButton>
</form>
