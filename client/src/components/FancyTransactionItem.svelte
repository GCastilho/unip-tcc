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
</style>
<tr on:click={() => {show = !show; console.log(show)}}>
	<td style="border-right:none"><img src="./assets/open-icon.svg" alt="open"></td>
	
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
			</tr><tr>
				<td class="{'subinfo'}">{transactionItem['account']}</td>
			</tr>
		</table>
	</td>
	<td style="border-right:none">{transactionItem['timestamp']}</td>

</tr>
