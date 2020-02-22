import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import Person from '../../../../db/models/person'
import Common from '../index'

/**
 * Retorna uma função que varre a collection checklist procurando por accounts
 * para criar e depois executa o checklistCleaner
 * 
 * Essa função também garante uma única instância do loop por curency para
 * impedir problemas de race condition
 */
export function create_account(this: Common) {
	/** Varíavel de contole das instâncias da create_account */
	let looping: boolean = false

	const _create_account = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			/** Cursor com os itens create_accounts 'requested' da checklist */
			const checklist = Checklist.find({
				currency: this.name,
				command: 'create_account',
				status: 'requested',
			}).cursor()
	
			let item: Ck
			while (this.isOnline && (item = await checklist.next())) {
				const account: string = await this.emit('create_new_account')
				await Person.findByIdAndUpdate(item.userId, {
					$push: {
						[`currencies.${this.name}.accounts`]: account
					}
				})

				item.status = 'completed'
				await item.save()
			}

			await this.checklistCleaner()
		} catch(err) {
			console.error('Error on create_account_loop:', err)
		}
		looping = false
	}

	return _create_account
}
