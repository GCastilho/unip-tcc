/*
 * src/currencyApi/currencyModule/_garbage_collector.js
 * 
 * Limpa a Checklist
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
		while (item = await checklist.next()) {
			if (item.$isEmpty('commands'))
				await item.remove()
		}
		collecting.item = false
	}

	/**
	 * Limpa os comandos vazios da item.commands[command] da checklist
	 */
	return async function commandCollector(command) {
		if (!command)
			throw new TypeError(`'command' needs to be informed`)
		if (collecting[command]) return
		collecting[command] = true
		/** Controla se pelo menos um item foi deletado da checklist */
		let collected = false
		const checklist = await Checklist.find().cursor()
		while (item = await checklist.next()) {
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
}
