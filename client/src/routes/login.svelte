<script>
	import axios from "../utils/axios"
	import { onMount } from 'svelte'
	import { goto } from '@sapper/app'
	import * as auth from '../stores/auth.js'
	import FancyInput from '../components/FancyInput.svelte'
	import FancyButton from '../components/FancyButton.svelte'
	import FormErrorMessage from '../components/FormErrorMessage.svelte'

	let errorMessage = undefined

	onMount(() => {
		// Redireciona para home caso esteja autenticado
		if ($auth) goto('/')
	})

	async function handleSubmit(event) {
		const email = event.target.email.value
		const password = event.target.password.value

		try {
			//quando for dar build trocar 'localhost:3001' por ${location.host}
			const { data: { token } } = await axios.post(
				'/v1/user/authentication',
				{ email, password }
			)
			/**
			 * @todo Adicionar handlers para os erros vindos do sistema
			 * de autenticação do websocket
			 */
			await auth.authenticate(token)

			/** Redireciona o usuário para a home */
			goto('/')
		} catch(err) {
			if (err.response && err.response.status === 401) {
				errorMessage = 'Invalid email or password'
			} else {
				errorMessage = err.response ? err.response.statusText : err
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
