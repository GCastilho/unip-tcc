import * as currencies from './_currencies'
import * as self from './_self'

export class CurrencyApi {
	// Módulos das currencies individuais
	protected currencies: any = {
		nano: new currencies.Nano(),
		bitcoin: new currencies.Bitcoin()
	}

	constructor() {
		// Inicia o listener
		self.listener.bind(this)(8085)
	}

}

const singleton = new CurrencyApi()
export default singleton

// console.log(singleton)
