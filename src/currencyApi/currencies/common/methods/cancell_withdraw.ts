import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import { ObjectId } from 'mongodb'
import Common from '../index'

/**
 * Retorna uma função que varre a collection checklist procurando por accounts
 * para criar e depois executa o checklistCleaner
 *
 * Essa função também garante uma única instância do loop por curency para
 * impedir problemas de race condition
 */
export function cancell_withdraw_loop(this: Common) {
	/** Varíavel de contole das instâncias da create_account */
	let looping = false

	const _cancell_withdraw = async () => {
        if (!this.isOnline || looping) return
		looping = true
		try {
			/** Cursor com os itens create_accounts 'requested' da checklist */
			const checklist = Checklist.find({
				currency: this.name,
				command: 'cancell_withdraw',
				status: 'requested',
			}).cursor()

			let item: Ck
			while (this.isOnline && (item = await checklist.next())) {
				const response: string = await this.emit('cancell_withdraw', item.opid)
				if(response == 'sucess'){
					item.status = 'completed'
					await item.save()
				}else if(response == 'failled to cancell'){

				}
			}
			await this.checklistCleaner()
		} catch(err) {
			console.error('Error on create_account_loop:', err)
		}
		looping = false
	}

	return _cancell_withdraw
}

export async function cancell_withdraw(this: Common, userId: ObjectId, opid: ObjectId) {
	try{
		const response: string = await this.emit('cancell_withdraw', opid)
		if(!response){
			await new Checklist({
				opid,
				userId,
				command: 'cancell_withdraw',
				currency: this.name,
				status: 'requested'
			}).save()
			return'requested'
		}
		return response
	}catch(err){
		throw err
	}
}
