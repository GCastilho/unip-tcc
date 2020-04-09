<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import FancyInputFilterTable from "../../components/FancyInputFilterTable.svelte"
	import FancyButton from "../../components/FancyButton.svelte"
	import FormErrorMessage from "../../components/FormErrorMessage.svelte"
	import FancyTransactionItem from "../../components/FancyTransactionItem.svelte"

	let errorMessage = undefined

	let transactions = []
	let TransactionTable;
	let filters={
		opid:          '',
		status:        '',
		currency:      '',
		txid:          '',
		account:       '',
		amount:        '',
		type:          '',
		confirmations: '',
		timestamp:     ''
	}

	onMount(() => {
		// Redireciona para home caso não esteja autenticado
		if (!$auth) goto('/')
		LoadTransactions();
	})

	async function LoadTransactions(){
		/**
		 * Carregar a ultima transaction do servidor e comparar se 
		 * existe na lista da store 
		 */
		/*
		console.log('Connecting to Api')
		try{
			console.log(JSON.stringify({sessionId:getCookie('sessionId')}))
			fetch('http://api.localhost:3001/v1/user/login',
				{
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					method:'POST',
					credentials:'include',
					body:JSON.stringify({sessionId:getCookie('sessionId')})
				}
			).then(()=>{
				console.log('Get Server data')
				fetch('http://api.localhost:3001/v1/user/transactions',
				{
					method:'GET',
					credentials: 'include'
				}).then(data=>{
					console.log(data.json())
				}).catch((err)=>{
					console.log("Error on retrieving data from api")
					console.log(err);
				})
			
			}).catch((err)=>{
				console.log("Error on connecting to api")
				console.log(err);
			})

		}catch(err){
			console.log(err);
		}
		/**
		 * Deletar Gerador de transactions apos criar coleta do servidor 
		 * >>>>>>>>>>>>>>>>>>>
		 */
		
		let tr=[];
		for(let i=0;i<20;i++){
			tr.push(
				{
					opid:          'id-'+i,
					status:        'status'+i,
					currency:      'currency'+i,
					txid:          'txid'+i,
					account:       'tx.account'+i,
					amount:        'tx.amount'+i,
					type:          'tx.type'+i,
					confirmations: 'tx.confirmations'+i,
					timestamp:     Date.now()
				}
			)
		}
		transactions = tr
		//*/
		/**
		 * <<<<<<<<<<<<<<<<<<<<<< DELETE THIS
		 */
	}

	function getCookie(name) {
		let value = "; " + document.cookie;
		let parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
	}
	
	let filteredList=[];

	$: filters, filteredList = transactions.filter(item => {
		return (
			(	filters.opid == '' && 
				filters.status == '' && 
				filters.currency == '' && 
				filters.txid == '' && 
				filters.account == '' && 
				filters.amount == '' && 
				filters.type == ''&& 
				filters.confirmations == ''&& 
				filters.timestamp == ''
			) || (
				item.opid.indexOf(filters.opid)> -1 && 
				item.status.indexOf(filters.status)> -1 && 
				item.currency.indexOf(filters.currency)> -1 && 
				item.txid.indexOf(filters.txid)> -1 && 
				item.account.indexOf(filters.account)> -1 && 
				item.amount.indexOf(filters.amount)> -1 && 
				item.type.indexOf(filters.type)> -1 && 
				item.confirmations.indexOf(filters.confirmations)> -1 && 
				(item.timestamp).toString().indexOf(filters.timestamp)> -1
			)
		)
	})
</script>

<style>


	.table_holder {
		width: calc(100vw - 100px);
		height: calc(100vh - 220px);
		border: 1px solid lightgray;
		background-color: #60606060;
		margin-top: 1.5em;
		margin-left: 0px;
		margin-right: 20px;
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 30px;
		overflow: scroll;
	}
	.table_holder table{
		border-collapse: collapse;
		margin-right:20px
	}
	.table_holder table td{
		border-right: 1px solid #80808080;
	}
	.table_holder table tr{
		border-top: 1px solid #80808080;
	}

</style>

<h1>Transactions</h1>
<div class="table_holder">
<table bind:this = {TransactionTable}>
	<thead>
		<td>
			<FancyInputFilterTable id='opid' bind:value={filters.opid}>OpID</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='status'  bind:value={filters.status}>Status</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='currency'  bind:value={filters.currency}>Currency</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='txid'  bind:value={filters.txid}>Txid</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='account'  bind:value={filters.account}>Account</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='amount'  bind:value={filters.amount}>Amount</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='type'  bind:value={filters.type}>Type</FancyInputFilterTable>
		</td>
		<td>
			<FancyInputFilterTable id='confirmations'  bind:value={filters.confirmations}>Confirmations</FancyInputFilterTable>
		</td>
		<td style="border-right:none">
			<FancyInputFilterTable id='timestamp'  bind:value={filters.timestamp}>Timestamp</FancyInputFilterTable>
		</td>
	</thead>
	<tbody>
	{#each filteredList as trs}
		<FancyTransactionItem transactionItem = {trs}></FancyTransactionItem>
	{:else}
      <tr>
        <td colspan="100%">
          <h5 class="text-center">There are no Transactions here.</h5>
        </td>
      </tr>
	{/each}
	</tbody>
</table>
</div>
