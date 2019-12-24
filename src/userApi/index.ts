import randomstring from 'randomstring'
import { sha512 } from 'js-sha512'
import FindUser from './findUser'
import currencyApi from '../currencyApi'
import PersonModel from '../db/models/person'
import { Person } from '../db/models/person/interface'

class UserApi {
	/**
	 * Expõe vários métodos para procurar por um usuário e retornar uma
	 * instância da classe User com ele
	 */
	findUser = new FindUser()

	/**
	 * Cria um novo usuário no database com as credenciais informadas
	 * 
	 * @throws ValidationError from mongoose.Error if document validation fails
	 * @returns The newly created document
	 */
	async createUser (email: string, password: string): Promise<Person> {
		const salt = randomstring.generate({ length: 32 })
		const password_hash = sha512.create()
			.update(salt)
			.update(password)
			.hex()
		
		const person = await new PersonModel({
			email,
			credentials: {
				salt,
				password_hash
			}
		}).save()

		/**
		 * @todo Criar as accounts quando o e-mail for confirmado, não ao
		 * criar o usuário
		 */
		currencyApi.create_accounts(person._id)

		return person
	}
}

/**
 * Api para métodos diretamente relacionadas a informações de um usuário salvas
 * no banco de dados, como balance, accounts, password, etc
 */
const userApi = new UserApi()
export = userApi
