<script lang="ts">
	import { goto } from '@sapper/app'
	import axios from 'axios'
	import FancyInput from '../../components/FancyInput.svelte'
	import FancyButton from '../../components/FancyButton.svelte'
	import FormErrorMessage from '../../components/FormErrorMessage.svelte'

	let errorMessage = ''

	async function handleSubmit(event) {
		const oldPassword = event.target.password_old.value
		const newPassword = event.target.password_new.value
		const passwordconfirm = event.target.password_confirm.value

		if (newPassword === passwordconfirm) {
			try {
				await axios.patch(window.location.href, {
					old: oldPassword,
					new: newPassword
				})

				/** Redireciona o usuário para a home */
				goto('/')
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
		margin-top: 0.5em;
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

<h1>Change Password</h1>
<form on:submit|preventDefault={handleSubmit}>
	{#if errorMessage}
		<FormErrorMessage>{errorMessage}</FormErrorMessage>
	{/if}
	<FancyInput id="password_old" type="password" autocomplete="current-password">
		Old Password
	</FancyInput>
	<FancyInput id="password_new" type="password" autocomplete="new-password">
		New Password
	</FancyInput>
	<FancyInput id="password_confirm" type="password" autocomplete="new-password">
		Confirm Password
	</FancyInput>

	<FancyButton type="submit">Update Password</FancyButton>
</form>
