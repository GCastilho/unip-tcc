import Person from '../db/models/person'

class User {
	/** @todo receber interface Person */
	private person: any

	constructor(person: any) {
		this.person = person
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
	user = (email: string): Promise<User> => {
		return Person.findOne({ email }).then(person => {
			if (!person) throw 'User not found'
			return new User(person)
		}).catch(err => {
			throw err
		})
	}
}

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
const userApi = new UserApi()
export = userApi
