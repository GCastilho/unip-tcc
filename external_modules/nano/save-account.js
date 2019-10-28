const Account = require(require.resolve(`./db/models/account`,{paths:[`./`,'../common']}))

function saveOrUpdate(data) {
	Account.collection.updateOne({
		account: data,
	},{$set: {isUpdated: true}},{upsert: true})
}
module.exports = {
	saveOrUpdate
}