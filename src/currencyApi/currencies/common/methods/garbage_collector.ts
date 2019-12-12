import Checklist from '../../../../db/models/checklist'

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
	 * Limpa os itens da checklist em que a prop 'commands' está vazia
	 */
	const itemCollector = async () => {
		await Checklist.deleteMany({ 'commands': null })
	}

	/**
	 * Limpa os comandos que são objetos vazios da checklist
	 */
	const commandCollector = async (command: string) => {
		const res = await Checklist.updateMany({
			[`commands.${command}`]: {}
		}, {
			$unset: {
				[`commands.${command}`]: true
			}
		})

		if (res.deletedCount && res.deletedCount > 0)
			await itemCollector()
	}

	return commandCollector
}
