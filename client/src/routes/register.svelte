<script context="module">
	export function preload(_page, session) {
		if (session.loggedIn) this.redirect(303, '/')
	}
</script>

<script lang="ts">
	import axios from 'axios'
	import FancyInput from '../components/FancyInput.svelte'
	import FancyButton from '../components/FancyButton.svelte'
	import FormErrorMessage from '../components/FormErrorMessage.svelte'

	/** true se o usuário completou o cadastro */
	let registered = false
	let email: string
	let errorMessage = ''

	async function handleSubmit(event) {
		email = event.target.email.value
		const password = event.target.password.value
		if (password != event.target.conf_password.value)
			return errorMessage = 'Password and confirmation pasword do not match'

		try {
			await axios.post(window.location.href, { email, password })
			registered = true
		} catch(err) {
			if (err.response?.status === 409) {
				errorMessage = 'Já existe um usuário cadastrado com o e-mail informado'
			} else {
				errorMessage = err.response?.statusText || err.message
			}
		}
	}
</script>

<style>
	h1, div {
		margin-top: 0.5em;
	}

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
		<!-- função ainda precisa ser implementada -->
		<FancyButton>Confirmar e-mail</FancyButton>
	</div>
{:else}
	<h1>Register</h1>
	<form on:submit|preventDefault={handleSubmit}>
		{#if errorMessage}
			<FormErrorMessage>{errorMessage}</FormErrorMessage>
		{/if}
		<FancyInput id="email" type="email">Email</FancyInput>
		<FancyInput id="password" type="password">Password</FancyInput>
		<FancyInput id="conf_password" type="password">Confirm password</FancyInput>

		<FancyButton type="submit">Register</FancyButton>
	</form>
{/if}
