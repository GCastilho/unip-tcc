<script lang="ts">
	import QRious from 'qrious'
	import { onMount } from 'svelte'
	import * as accountsStore from '../_stores/accounts'
	import type { Currencies } from '../../currencies'

	export let currency: keyof Currencies

	const accounts = $accountsStore[currency]
	let selectedAccount = ''

	// Qr Code stuff
	let qrious: QRious
	let canvas: HTMLCanvasElement

	onMount(() => {
		// Seleciona a primeira account do usuário
		selectedAccount = accounts[0]

		// Desenha o QR Code
		qrious = new QRious({
			element: canvas,
			value: `${currency}:${selectedAccount}`
		})
	})

	/** Atualiza o valor do qr code com o selectedAccount */
	const setQrCode = () => qrious.set({ value: `${currency}:${selectedAccount}` })
</script>

<style>
	* {
		margin-left: auto;
		margin-right: auto;
	}

	h4 {
		font-weight: bold;
	}

	li {
		list-style-type: none;
		padding: 3px;
		cursor: pointer;
	}

	ul {
		padding: 0;
	}

	.list-active-item {
		border: 1px solid var(--table-borders);
		border-radius: 3px;
		background-color: white;
	}

	canvas {
		display: block;
	}

	.qr-container {
		border: 1px solid var(--table-borders);
		height: 100%;
		margin-top: 15px;
		margin-bottom: 15px;
		padding: 10px;
		border-radius: 10px;
		background-color: white;
	}
</style>

<ul>
	<h4>Select deposit address</h4>
	{#each accounts as account}
		<li
			class:list-active-item="{selectedAccount === account}"
			on:click="{() => selectedAccount = account}"
			on:click="{setQrCode}"
		>{account}</li>
	{/each}
</ul>
<div class="qr-container">
	<canvas bind:this={canvas}></canvas>
</div>
