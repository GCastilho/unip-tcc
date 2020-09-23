<script>
	export let transactionItem
	let show = false;
</script>

<style>

	td{
		border-right: 1px solid #80808080;
		padding-left: 10px;
	}
	tr{
		border: 2px solid #80808080;
		border-bottom: none;
	}
	.hide_segment{
		border-top: 1px solid #80808080;
	}
	img{
		height: 15px;
	}
	.noborder tr, .noborder td{
		border: none;
	}
	.subinfo{
		color: #606060;
	}
	table{
		width: 100%;
	}
</style>
<tr on:click={() => {show = !show; console.log(show)}}>
	{#if show}
		<td style="border-right:none"><img src="./assets/open-icon.svg" alt="open" title="Open More Info"></td>
	{:else}
		<td style="border-right:none"><img src="./assets/close-icon.svg" alt="close" title="Close More Info"></td>
	{/if}
	<td>
		<table class="{'noborder'}">
			<tr>
				<td>{transactionItem['type']}</td>
			</tr><tr>
				<td class="{'subinfo'}">{transactionItem['status']}</td>
			</tr>
		</table>
	</td>
	<td>{transactionItem['amount']}</td>

	<td>
		<table class="{'noborder'}">
			<tr>
				<td>{transactionItem['txid']}</td>
			</tr>
			<tr>
				<td class="{'subinfo'}">{transactionItem['account']}</td>
			</tr>
		</table>
	</td>
	<td style="border-right:none">{transactionItem['timestamp']}</td>
</tr>
{#if show}
<tr class="hide_segment">
	<td style="border:none"></td>
	<td colspan="2">OpId: {transactionItem['opid']}</td>
	<td>Currency: {transactionItem['currency']}</td>
	<td style="border-right:none">Confirmations: {transactionItem['confirmations']}</td>
</tr>
{/if}
