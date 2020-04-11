<script>
	import { onMount } from "svelte"
	import { goto } from "@sapper/app"
	import axios from "../../utils/axios.js"
	import * as auth from "../../stores/auth.js"
	import FancyInputFilterTable from "../../components/FancyInputFilterTable.svelte"
	import FancyButton from "../../components/FancyButton.svelte"
	import FormErrorMessage from "../../components/FormErrorMessage.svelte"
	import FancyTransactionItem from "../../components/FancyTransactionItem.svelte"
	import { transactionsList } from "../../stores/transactions"

	let errorMessage = undefined
	let transactions

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
			 * Faz o login na api e gera o cookie para o subdomínio
			 * OBS mover posteriormente esse login para ser feito apos logar no
			 * domínio principal
			 */
			fetch('http://api.'+window.location.host+'/v1/user/login',{
				method:'POST',
				credentials:'include',
				/**
				 * necessita passar o valor do cookie pelo body pois o cookie não estava sendo enviado
				 * mesmo colocando o dominio *.localhost
				 * necessita pesquisar mais a fundo como gerar requests para subdomínio
				 * usando o cookie do domínio principal
				 */
				body:JSON.stringify({sessionId:getCookie('sessionId')})
			}).then((res)=>{
				if(res.status == 200){
					/**
					 * Apos relizar o login na api com o sessionID recarrega a lista de transactions
					 */
					fetch('http://api.'+window.location.host+'/v1/user/lasttransaction',
					{
						method:'GET',
						credentials: 'include' // passa os cookies da api.localhost
					}).then(data=>{
						return data.json()
					}).then(data =>{
						if(!!data[0] && !!transactionsList[0]){ //checa se existe o id 0
							if(data[0].opid != transactionsList[0].opid){
								/**
								 * se a ultima transaction for diferente da armazenada na store 
								 * faz um request para o servidor pedindo pelas 10 mais atualizadas
								 */
								reloadListFromServer()
							}
						}
					}).catch((err)=>{
						console.log("Error on retrieving data from api")
						console.log(err);
					})
				}else{
					console.log("Error on connecting to api")
				}
			}).catch((err)=>{
				console.log("Error on connecting to api")
				console.log(err);
			})

		}catch(err){
			console.log(err);
		}
		/**
		 * Deletar Gerador de transactionsList apos criar coleta do servidor 
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
		transactionsList.set(tr)
		//*/
		/**
		 * <<<<<<<<<<<<<<<<<<<<<< DELETE THIS
		 */
	}


	/**
	 *	Recarrega a lista do servidor  
	 */
	async function reloadListFromServer(){
		fetch('http://api.'+window.location.host+'/v1/user/transactions',
		{
			method:'GET',
			credentials: 'include' // passa os cookies da api.localhost
		}).then(data=>{
			return data.json()
		}).then(data =>{
			transactionsList.set(data) // reseta a lista para a do servidor	
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
