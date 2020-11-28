import * as sapper from '@sapper/app'
import { connect } from './utils/websocket'

sapper.start({
	target: document.querySelector('#sapper')
}).then(connect)
