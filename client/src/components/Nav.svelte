<script>
	import { stores } from '@sapper/app'
	import { route } from '../utils/websocket.js'
	import * as auth from '../stores/auth.js'
	import '../stores/balances.js' // Inicializa a store de balances

	export let segment

	// Roteia o websocket a cada atualização do path da página
	const { page } = stores()
	page.subscribe(value => route(value.path))
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
		display: block;
	}
    img{
        height:30px;
        width:30px;
    }
</style>

<nav>
	<ul>
		<li><a class:selected='{segment === undefined}' href='.'>home</a></li>
		<li><a class:selected='{segment === "about"}' href='about'>about</a></li>

		<div style="float:right">
			{#if $auth}
                <li><a class:selected={segment === 'user'} href="user"><img alt="User" src="./user-icon.png" /></a></li>
				<li><a class:selected='{segment === "balances"}' href="balances">balances</a></li>
				<li><a on:click={auth.deauthenticate} href="/">logout</a></li>
			{:else}
				<li><a class:selected='{segment === "login"}' href="login">login</a></li>
				<li><a class:selected='{segment === "register"}' href="register">register</a></li>
			{/if}
		</div>
	</ul>
</nav>
