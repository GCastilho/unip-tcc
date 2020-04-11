const proxy = require('subdomain-router')

const {ROUTER_PORT, PORT, SERVER_PORT } = process.env
const router_port = ROUTER_PORT || 3000
const api_port = SERVER_PORT || 3001
const page_port = PORT || 3002

proxy({
	host: 'localhost',
	subdomains: {
		'': page_port,
		www: page_port,
		api: api_port
	}
}).listen(router_port,()=>{
	console.log(`DevRouter Listening on: http://localhost:${router_port}`)
})
