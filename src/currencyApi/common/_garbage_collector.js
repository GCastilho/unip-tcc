/*
 * src/currencyApi/currencyModule/_garbage_collector.js
 * 
 * Esse módulo exporta uma função que recebe um 'command' como argumento e
 * varre a collection da checklist procurando por por itens onde 'command' é
 * vazio e os deleta (do item), em seguida ele chama o itemCollector
 * 
 * O itemCollector procurar por itens na checklist que tem todos os seus
 * comandos completados (ou seja, item.commands está vazio) e os deleta (os
 * itens) da checklist
 */

const Checklist = require('../../db/models/checklist')

module.exports = function constructor() {
	/**
	 * Controla se há uma instancia do collector para [command]
	 */
	const collecting = {}

	/**
	 * Limpa os itens com item.commands vazios da checklist
	 */
	const itemCollector = async () => {
		if (collecting.items) return
		collecting.item = true
		const checklist = await Checklist.find().cursor()
		while ((item = await checklist.next())) {
			if (item.$isEmpty('commands'))
				await item.remove()
		}
		// eslint-disable-next-line require-atomic-updates
		collecting.item = false
	}

	/**
	 * Limpa os comandos vazios da item.commands[command] da checklist
	 */
	return async function commandCollector(command) {
		if (!command)
			throw new TypeError('\'command\' needs to be informed')
		if (collecting[command]) return
		collecting[command] = true
		/** Controla se pelo menos um item foi deletado da checklist */
		let collected = false
		const checklist = await Checklist.find().cursor()
		while (( item = await checklist.next() )) {
			if (item.$isEmpty(`commands.${command}`)) {
				item.commands[command] = undefined
				await item.save()
				collected = true
			}
		}
		if (collected)
			await itemCollector()
		// eslint-disable-next-line require-atomic-updates
		collecting[command] = false
	}
}
