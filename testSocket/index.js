const axios = require('axios')
const randomstring = require('randomstring')

let counter = 0

function register() {
	counter++
	axios.post('http://localhost:3000/register', {
		email: `${randomstring.generate()}@example.com`,
		password: randomstring.generate()
	}).then((res) => {
		console.log(res.data)
	}).catch(err => {
		console.log(err.response.statusText)
	})
	if (counter < 3)
		setTimeout(register, 100)

}

function new_transaction() {
	axios.post('http://localhost:8085/new_transaction/nano',{
		block: 'F66C29E6E060DE5606DB0F6FCB7F03F41C42F48D2A079046ECBEA83FA1D8A2C5',
   		account: 'nano_3xme79mg1r8ycr5fp5uhsfzi9x1wadtatci9k35gshoa9yixjap7xyi5aq41',
  		amount: '3000000000000000000000000000000',
		time: 1572940808584
	}).then(res => {
		// console.log(res.data)
	}).catch(err => {
		console.log(err.response.statusText)
	})
}

//register()
new_transaction()