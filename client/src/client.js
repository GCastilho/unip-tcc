import axios from 'axios'
import * as sapper from '@sapper/app'
import { init } from './utils/currencies'
import { connect } from './utils/websocket'

// Conecta com o websocket
connect()

// Inicializa o módulo de currencies
axios.get('/currencies').then(res => {
	init(res.data)
}).then(() => {
	return sapper.start({
		target: document.querySelector('#sapper')
	})
}).catch(err => {
	console.error('Error initializing client:', err)
})
