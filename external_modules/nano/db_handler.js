const mongoose = require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/exchange', {
	user: 'exchange_server',
	pass: 'uLCwAJH49ZRzCNW3',
	useNewUrlParser: true,
	useCreateIndex: true
})

const account = mongoose.model('account', { account: String })

module.exports = {
    accountModel : account
}