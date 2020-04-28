<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import FancyInputFilterTable from "../../components/FancyInputFilterTable.svelte"
	import FancyButton from "../../components/FancyButton.svelte"
	import FormErrorMessage from "../../components/FormErrorMessage.svelte"
	import FancyTransactionItem from "../../components/FancyTransactionItem.svelte"
	import * as transactionsList  from "../../stores/transactions"

	let errorMessage = undefined
	let transactions = []
	let skipTransaction = 0

	transactionsList.subscribe(value => {transactions = value})

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
		try{
			/**
			 * Apos relizar o login na api com o sessionID recarrega a lista de transactions
			 */
			fetch('http://api.'+window.location.host+'/v1/user/transactions',
			{
				method:'GET',
				credentials: 'include' // passa os cookies da api.localhost
			}).then(data=>{
				return data.json()
			}).then(data =>{
				if(!!data.error){ throw data.message; }
				if(!!data[0] && !!transactions[0]){ //checa se existe o id 0
					if(data[0].opid != transactions[0].opid){
						/**
						 * se a ultima transaction for diferente da armazenada na store 
						 * faz um request para o servidor pedindo pelas 10 ultimas
						 */
						reloadListFromServer()
					}
				}else{
					/**
					 * se não existir nenhuma salva na store 
					 * faz um request para o servidor pedindo pelas 10 ultimas
					 */
					reloadListFromServer()
				}
			}).catch((err)=>{
				console.log("Error on retrieving data from api")
				console.log(err);
			})
		}catch(err){
			console.log(err);
		}
		reloadListFromServer() // para teste apenas
	}


	/**
	 *	Recarrega a lista do servidor  
	 */
	function reloadListFromServer(){
		fetch('http://api.'+window.location.host+'/v1/user/transactions',
		{
			method:'GET',
			credentials: 'include' // passa os cookies da api.localhost
		}).then(data=>{
			return data.json()
		}).then(data =>{
			/**
			 *  reseta a lista para a do servidor
			 *  OBS: como ele recupera todas as ultimas transactions é mais facil resetar a listagem salva
			 * 	ou implementar uma função para retorno da ultima apenas (txid somente)
			 */
			transactionsList.set(data) //produção
			transactionsList.set(generator()) //teste
		}).catch((err)=>{
			console.log("Error on retrieving data from api")
			console.log(err);
		})
	}

	function getCookie(name) {
		let value = "; " + document.cookie;
		let parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
	}

	function loadMore(){
		fetch('http://api.'+window.location.host+'/v1/user/transactions' + '?skip='+skipTransaction,
		{
			method:'GET',
			credentials: 'include' // passa os cookies da api.localhost
		}).then(data=>{
			return data.json()
		}).then(data =>{
			let tr = transactions.concat(generator()) // Teste
			//let tr = transactions.concat(data) //Produção
			skipTransaction = tr.length;
			transactionsList.set(tr)
		}).catch((err)=>{
			console.log("Error on retrieving data from api")
			console.log(err);
		})
	}

	/**
	 * Deletar Gerador de transactionsList apos criar coleta do servidor
	 * >>>>>>>>>>>>>>>>>>>
	 */
	function generator(){
		let tr = []
		for(let i = skipTransaction;i < 10 + skipTransaction;i++){
			tr.push(
				{
					opid:          'id-' + i,
					status:        'status' + i,
					currency:      'currency' + i,
					txid:          'txid' + i,
					account:       'tx.account' + i,
					amount:        'tx.amount' + i,
					type:          'tx.type' + i,
					confirmations: 'tx.confirmations' + i,
					timestamp:     Date.now()
				}
			)
		}
		return tr
	}
	//*/
	/**
	 * <<<<<<<<<<<<<<<<<<<<<< DELETE THIS
	 */

	let filteredList=[];
	$: filters, transactions, filteredList = transactions.filter(item => {
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
	let scrollHandle = (o)=>{
		//visible height + pixel scrolled < total height
		console.log(o)
		console.log((o.target.offsetHeight + o.target.scrollTop) + " " + o.target.scrollHeight)
		if(window.pageYOffset - document.body.scrollHeight + window.innerHeight == 0)
		{
			loadMore()
		}
	}
</script>

<style>


	.table_holder {
		width: calc(100vw - 100px);
		min-height: calc(100vh - 220px);
		border: 1px solid lightgray;
		background-color: #60606060;
		margin-top: 1.5em;
		margin-left: 0px;
		margin-right: 20px;
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
		line-height: 30px;
		overflow: hidden;
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

<svelte:window style="overflow-x:hidden" on:scroll={scrollHandle}/>

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
