module.exports = function create_account() {
	return this._module.get('new_account')
	.then(({ data }) => {
		return data
	}).catch(err => {
		throw new Error(`Fail do to retrieve ${this.name} account`)
	})
}
