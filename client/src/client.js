import * as sapper from '@sapper/app'
import './utils/websocket'

sapper.start({
	target: document.querySelector('#sapper')
})
