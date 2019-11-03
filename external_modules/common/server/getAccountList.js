/*
 * external_modules/common/getAccountList.js
 *
 * Solicita ao servidor principal a lista de contas dos usuarios
 */

const axios = require('axios')
const Account = require(require.resolve('./db/models/account', { paths: ['./', '../common'] }))

module.exports = function getAccountList(currency) {
	process.stdout.write(`Requesting ${currency} accounts... `)

	return new Promise((resolve, reject) => {
		axios.get(`http://${global.main_server_ip}/account_list/${currency}`, {
			responseType: 'stream'
		}).then(({ data }) => {
			console.log('Success\nReceiving account stream and importing accounts into private database')
	
			data.on('data', (chunk) => {
				/** Cada chunk é uma account */
				Account.collection.updateOne({
					account: chunk.toString(),
				}, {
					$set: {
						isUpdated: true
					}
				}, {
					upsert: true
				})
			})
	
			data.on('end', () => {
				console.log(`All ${currency} accounts received and imported successfuly!`)
				Account.deleteMany({ isUpdated: false }).exec()
				resolve()
			})
		}).catch(err => {
			reject(err)
		})
	})
}
