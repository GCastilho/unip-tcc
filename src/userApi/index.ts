import Person = require('../db/models/person')

class User {
	private person: any

	constructor(email: string) {
		Person.findOne({ email }).then(person => {
			if (!person) throw 'User not found'
			this.person = person
		}).catch(err => {
			throw err
		})
	}

	/**
	 * Retorna o saldo de um usuário para determinada currency
	 */
	getBalance = (currency: string): number => this.person.currencies[currency].balance

	/**
	 * Retorna as accounts de um usuário para determinada currency
	 */
	getAccounts = (currency: string): string[] => this.person.currencies[currency].accounts
}

class UserApi {
	/**
	 * Retorna uma instância de um usuário, com métodos para acessar e modificar
	 * dados do mesmo no database
	 */
	user = (email: string): User => new User(email)
}

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
const userApi = new UserApi()
export default userApi
