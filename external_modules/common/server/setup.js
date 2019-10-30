const mongoose = require('../db/mongoose')
const Account = require(require.resolve(`./db/models/account`, { paths: [`./`, '../common'] }))
const connectToMainServer = require('./connectToMainServer')
const getAccountList = require('./getAccountList')

module.exports = async function serverSetup(currency) {
	if (!currency) throw new TypeError ('\'currency\' needs to be informed')

	await mongoose.init(`exchange-${currency}`)
	await Account.collection.updateMany({},{$set: {isUpdated: false}},{})
	await connectToMainServer(currency)
	await getAccountList(currency)
}
