<script>
	import axios from 'axios'
	import { stores } from '@sapper/app'
	import { deauthenticate } from '../utils/websocket'

	export let segment

	const { session } = stores()

	async function logout() {
		await axios.delete('/login', { withCredentials: true })
		await deauthenticate()
		$session.loggedIn = false
	}

	let userdropdown = 'hide'
</script>

<style>
	nav {
		border-bottom: 1px solid rgba(255,62,0,0.1);
		font-weight: 300;
		padding: 0 1em;
	}

	ul {
		margin: 0;
		padding: 0;
	}

	/* clearfix */
	ul::after {
		content: '';
		display: block;
		clear: both;
	}

	li {
		display: block;
		float: left;
	}

	.selected {
		position: relative;
		display: inline-block;
	}

	.selected::after {
		position: absolute;
		content: '';
		width: calc(100% - 1em);
		height: 2px;
		background-color: rgb(255,62,0);
		display: block;
		bottom: -1px;
	}

	a {
		text-decoration: none;
		padding: 1em 0.5em;
		display: flex;
		align-items: center;
		white-space: nowrap;
	}

	a > img {
		padding-right: 6px;
	}

	img {
		height:20px;
		width:20px;
	}

	.dropdown-button {
		text-decoration: none;
		padding: 1em 0.5em;
		display: block;
	}

	.dropdown {
		z-index: 2;
		width: 180px;
		position: absolute;
		right: 10px;
		height: 0;
		opacity: 1;
		transition: 0.5s height;
		overflow: hidden;
		background-color: #d0d0d0;
	}

	.show {
		opacity: 1;
		height: calc(4em * 2); /* 4em * Numero de itens */
		transition: 0.5s height;
	}
</style>

<nav>
	<ul>
		<li><a rel=prefetch class:selected={segment === undefined} href="/">home</a></li>
		<li><a rel=prefetch class:selected={segment === 'market'} href="market">market</a></li>
		<li><a rel=prefetch class:selected={segment === 'about'} href="about">about</a></li>

		<div style="float:right">
			{#if $session.loggedIn}
				<li><a rel=prefetch class:selected={segment === 'balances'} href="balances">balances</a></li>
				<li on:mouseover={() => userdropdown = 'show'} on:mouseleave={() => userdropdown = 'hide'}>
					<div class='dropdown-button' class:selected = {userdropdown === 'show' || segment === 'user'}>
						<img alt="Config" title="Config" src="/assets/settings-icon.svg" />
					</div>
					<div id="dropdown_usermenu" class="{userdropdown === 'show' ? 'dropdown show' : 'dropdown'}">
						<table>
							<tr><td>
								<a
									class:selected="{segment === '/user/changepass'}"
									on:click={() => userdropdown = 'hide'}
									href="/user/changepass"
								><img alt="Senha" title="Alterar Senha" src="/assets/key-icon.svg" />
									Change Password
								</a>
							</td></tr>
							<tr><td>
								<a
									class:selected={segment === 'user/transactions'}
									on:click={() => userdropdown = 'hide'}
									href="/user/transactions"
								><img alt="Transactions" title="Transactions" src="/assets/transaction.svg" />
									Transactions
								</a>
							</td></tr>
						</table>
					</div>
				</li>
				<li>
					<a rel=prefetch on:click={logout} href="/">
						<img alt="Logout" title="Logout" src="/assets/logout-icon.svg" />
					</a>
				</li>
			{:else}
				<li><a class:selected={segment === 'login'} href="login">login</a></li>
				<li><a class:selected={segment === 'register'} href="register">register</a></li>
			{/if}
		</div>
	</ul>
</nav>
