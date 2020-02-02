<script>
	import axios from 'axios'
	import { goto } from '@sapper/app'
	import FancyInput from '../components/FancyInput.svelte'
	import FancyButton from '../components/FancyButton.svelte'
	import FormErrorMessage from '../components/FormErrorMessage.svelte'

	let errorMessage = undefined

	async function handleSubmit(event) {
		const email = event.target.email.value
		const password = event.target.password.value

		try {
			await axios.post(window.location, { email, password })
			const sessionID = document.cookie.replace(/(?:(?:^|.*;\s*)sessionID\s*=\s*([^;]*).*$)|^.*$/, "$1")
			//TODO: autenticar o socket

			/** Manualmente redireciona para home */
			goto('/')
		} catch(err) {
			if (err.response.status === 401) {
				errorMessage = 'Invalid email or password'
			} else {
				errorMessage = err.response.statusText
			}
		}
	}
</script>

<style>
	h1, p {
		text-align: center;
	}

	p {
		margin: 0;
		line-height: 1em;
		padding-bottom: 1em;
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

<h1>Login</h1>
<form on:submit|preventDefault={handleSubmit}>
	{#if errorMessage}
		<FormErrorMessage>{errorMessage}</FormErrorMessage>
	{/if}
	<FancyInput id="email" type="email">Email</FancyInput>
	<FancyInput id="password" type="password">Password</FancyInput>
	
	<p>Don't have an account? <a href="/register">Create account</a></p>

	<FancyButton type="submit">Login</FancyButton>
</form>
