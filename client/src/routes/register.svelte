<script>
	import axios from 'axios'
	import { onMount } from 'svelte'
	import { goto } from '@sapper/app'
	import * as auth from '../stores/auth.js'
	import FancyInput from '../components/FancyInput.svelte'
	import FancyButton from '../components/FancyButton.svelte'
	import FormErrorMessage from '../components/FormErrorMessage.svelte'

	/** true se o usuário completou o cadastro */
	let registered = false
	let email = undefined
	let errorMessage = undefined

	onMount(() => {
		// Redireciona para home caso esteja autenticado
		if ($auth) goto('/')
	})

	async function handleSubmit(event) {
		email = event.target.email.value
		const password = event.target.password.value
		if (password !== event.target.conf_password.value)
			return alert('Confirmation pasword mismatch password')

		try {
			await axios.post(window.location, { email, password })
			registered = true
		} catch(err) {
			if (err.response.status === 409) {
				errorMessage = 'Já existe um usuário cadastrado com o e-mail informado'
			} else {
				errorMessage = err.response.statusText
			}
		}
	}
</script>

<style>
	h1, h2, p {
		text-align: center;
	}

	form, div {
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

	div {
		width: 400px;
	}
</style>

{#if registered}
	<div>
		<h2>Confirme o email</h2>
		<p>
			Enviamos um email de confirmação de cadastro para <b>{email}</b>, para ativar sua conta por favor siga as instruções informadas no email
		</p>
		<FancyButton>Confirmar e-mail</FancyButton> <!-- {/*função ainda precisa ser implementada*/} -->
	</div>
{:else}
	<h1>Register</h1>
	<form method="POST" on:submit|preventDefault={handleSubmit}>
		{#if errorMessage}
			<FormErrorMessage>{errorMessage}</FormErrorMessage>
		{/if}
		<FancyInput id="email" type="email">Email</FancyInput>
		<FancyInput id="password" type="password">Password</FancyInput>
		<FancyInput id="conf_password" type="password">Confirm password</FancyInput>

		<FancyButton type="submit">Register</FancyButton>
	</form>
{/if}
