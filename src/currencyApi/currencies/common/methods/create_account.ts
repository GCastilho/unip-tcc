import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import Person from '../../../../db/models/person'
import Common from '../index'

/**
 * Retorna uma função que varre a collection checklist procurando por accounts
 * para criar
 * 
 * Essa função tem um garbage collector em seu closure, para limpar o comando
 * 'create_account' da checklist. Ao terminar ela chama o garbage_collector da
 * classe
 * 
 * Essa função também garante uma única instância por curency varrendo a
 * checklist para criar accounts para impedir problemas de race condition
 */
export function create_account(this: Common) {
	/**
	 * Controla as instâncias da create_account
	 */
	let looping: boolean = false

	this._events.on('connected', () => {
		_create_account()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

	/**
	 * Limpa da commands.create_accounts os requests de currencies
	 * com status 'completed'
	 */
	const garbage_collector = async () => {
		const res = await Checklist.updateMany({
			[`commands.create_accounts.${this.name}.status`]: 'completed'
		}, {
			$unset: {
				[`commands.create_accounts.${this.name}`]: true
			}
		})

		// Nenhum create_account foi deletado
		if (!res.nModified) return

		await this.garbage_collector('create_accounts')
	}

	const create_account_loop = async () => {
		const checklist = Checklist.find({
			[`commands.create_accounts.${this.name}.status`]: 'requested'
		}).cursor()

		let item: Ck
		while (( looping && (item = await checklist.next()) )) {
			const account: string = await this.module('create_new_account')
			await Person.findByIdAndUpdate(item.userId, {
				$push: {
					[`currencies.${this.name}.accounts`]: account
				}
			})

			await Checklist.updateOne({
				userId: item.userId
			}, {
				$set: {
					[`commands.create_accounts.${this.name}.status`]: 'completed'
				}
			})

			// item.commands.create_accounts[this.name].status = 'completed'
			// await item.save()
		}
	}

	const _create_account = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await create_account_loop()
			await garbage_collector()
		} catch(err) {
			console.error('Error on create_account_loop:', err)
		}
		looping = false
	}

	return _create_account
}
