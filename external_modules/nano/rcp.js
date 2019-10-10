var rpc = require('node-json-rpc');

var options = {
	port: 55000,
	host: '::1',
	// string with default path, default '/'
	path: '/',
	// boolean false to turn rpc checks off, default true
	strict: false
};
var client = new rpc.Client(options);

createWallet = {
	"action": "wallet_create"
};
createAccount = {
	"action": "account_create",
	"wallet":"F80357B81E856EF1BA68EE35974BAFEFDACEFB3DA4B5A06F904DE211C916D85E"
};
accountInfo = {
	"action": "account_info",
	"account":"nano_1qiyu5rezx6tf3amexpjsub5xy6orzscukoqd9qab5rjcgq8zqr9xbbp18sw"
};
walletInfo = {
	"action": "wallet_info",
	"wallet":"F80357B81E856EF1BA68EE35974BAFEFDACEFB3DA4B5A06F904DE211C916D85E"
};
sendCall = {
	"action": "send",
	"wallet": "F80357B81E856EF1BA68EE35974BAFEFDACEFB3DA4B5A06F904DE211C916D85E",
	"source": "nano_1qiyu5rezx6tf3amexpjsub5xy6orzscukoqd9qab5rjcgq8zqr9xbbp18sw",
	"destination": "nano_13bdijqsqirg6r5nkkbmm8dqpbuiqtj4pnenqszh3yir4er3kk33xmdo8jgw",
	"amount": "1000000",
	"id": "uahddbma"
};
blockInfo = {
		"action": "block_info",
		"json_block": "true",
		"hash": "E4582891946328E2869209C386BE9173DF7FBF77DB246A06CC6491165714D359"
};
rawToNano = {
	"action": "rai_from_raw",
	"amount": "9999999999999999999999999999000000"
}
nanoToRaw = {
	"action": "rai_to_raw",
	"amount": "9999999999999"
}

/*function sendNano(sender,receiver,ammmount){
	client.call({
	"action": "send",
	"wallet": "F80357B81E856EF1BA68EE35974BAFEFDACEFB3DA4B5A06F904DE211C916D85E",
	"source": sender,
	"destination": receiver,
	"amount": ammmount,
	}, function (err, res) {
				// Did it all work ?
				if (err) { console.log(err); }
				else { console.log(res); }
			}
		)
},*/

function createAccount(request,response){
	client.call(createAccount,function (err, res) {
		// Did it all work ?
		if (err) { 
			response = "error"
			console.log(err); }
		else {
			response.send(res.account)
		}
	})
}

module.exports = {
	createAccount
}
