import Checklist = require('../../../../db/models/checklist')

/**
 * Retorna uma função que recebe um 'command' como argumento e varre a checklist
 * procurando por itens onde a propriedade commands[command] é vazia e as
 * remove do item
 * 
 * Em seguida a função do closure 'itemCollector' é chamada, que procura por
 * itens na checklist cuja propriedade 'commands' está vazia e os deleta
 */
export function garbage_collector() {
	/**
	 * Controla se há uma instancia do collector para [command]
	 */
	const collecting: any = {}

	/**
	 * Limpa os itens com item.commands vazios da checklist
	 */
	const itemCollector = async () => {
		if (collecting.item) return
		collecting.item = true
		const checklist = await Checklist.find().cursor()
		let item: any
		while ((item = await checklist.next())) {
			if (item.$isEmpty('commands'))
				await item.remove()
		}
		collecting.item = false
	}

	/**
	 * Limpa os comandos vazios da item.commands[command] da checklist
	 */
	const commandCollector = async (command: string) => {
		if (collecting[command]) return
		collecting[command] = true
		/** Controla se pelo menos um item foi deletado da checklist */
		let collected = false
		const checklist = await Checklist.find().cursor()
		let item: any
		while (( item = await checklist.next() )) {
			if (item.$isEmpty(`commands.${command}`)) {
				item.commands[command] = undefined
				await item.save()
				collected = true
			}
		}
		if (collected)
			await itemCollector()
		collecting[command] = false
	}

	return commandCollector
}
