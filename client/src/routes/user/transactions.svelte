<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import FancyInput from "../../components/FancyInput.svelte"
	import FancyButton from "../../components/FancyButton.svelte"
	import FormErrorMessage from "../../components/FormErrorMessage.svelte"
	import FancyTransactionItem from "../../components/FancyTransactionItem.svelte"

	let errorMessage = undefined

	let transactions = []
	let TransactionTable;
	let filters={}

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
					status:        'status',
					currency:      'currency',
					txid:          'txid',
					account:       'tx.account',
					amount:        'tx.amount',
					type:          'tx.type',
					confirmations: 'tx.confirmations',
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

	$: filteredList = transactions.filter(item => {
			console.log(item)
			console.log(filters)
			Object.keys(filters).forEach(key=>{
				if(filters[key]){
					if(transactionItem[key]){
						return (transactionItem[key].indexOf(filters[key])>-1)
					}
				}
			})
			return true
		}
	);
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

<h1>Transactions</h1>

<table bind:this = {TransactionTable}>
	<thead>
		<td>
			<FancyInput id="OpID" bind:value={filters['opid']}>OpID</FancyInput>
		</td>
		<td>
			<FancyInput id="Status" bind:value={filters['status']}>Status</FancyInput>
		</td>
		<td>
			<FancyInput id="Timestamp" bind:value={filters['status']}>Timestamp</FancyInput>
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
