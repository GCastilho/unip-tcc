const Account = require(`./db/models/account`)

function saveOrUpdate(data) {
	Account.collection.updateOne({
		account: data,
	},{$set: {isUpdated: true}},{upsert: true})
}

module.exports = {
	saveOrUpdate
}