<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import FancyInput from "../../components/FancyInput.svelte"
	import FancyButton from "../../components/FancyButton.svelte"
	import FormErrorMessage from "../../components/FormErrorMessage.svelte"

	let errorMessage = undefined

	onMount(() => {
		// Redireciona para home caso não esteja autenticado
		if (!$auth) goto('/')
	})

	async function handleSubmit(event) {
		const oldPassword = event.target.password_old.value
		const newPassword = event.target.password_new.value
		const passwordconfirm = event.target.password_confirm.value

		if (newPassword === passwordconfirm) {
			try {
				const { token } = await axios.patch(
					`${location.protocol}//api.${location.hostname}:3001/v1/user/`,
					{
						oldPassword,
						newPassword
					},
					{ withCredentials: true }
				)
				/**
				 * @todo Adicionar handlers para os erros vindos do sistema
				 * de autenticação do websocket
				 */
				//await auth.authenticate(token)

				/** Redireciona o usuário para a home */
				goto("/")
			} catch (err) {
				if (err.response.status === 401) {
					switch(err.response.data.error) {
						case('NotLoggedIn'):
							errorMessage = 'Authentication error'
							break
						case('NotAuthorized'):
							errorMessage = 'Fail to verify old password'
							break
						default:
							errorMessage = `Unknown error response: ${err.response.error}`
					}
				} else {
					errorMessage = err.response.statusText
				}
			}
		} else {
			errorMessage = 'Passwords are different'
		}
	}
</script>

<style>
	h1 {
		text-align: center
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

<h1>Alterar Senha</h1>
<form on:submit|preventDefault={handleSubmit}>
	{#if errorMessage}
		<FormErrorMessage>{errorMessage}</FormErrorMessage>
	{/if}
	<FancyInput id="password_old" type="password">Old Password</FancyInput>
	<FancyInput id="password_new" type="password">New Password</FancyInput>
	<FancyInput id="password_confirm" type="password">Confirm Password</FancyInput>

	<FancyButton type="submit">Update Password</FancyButton>
</form>
