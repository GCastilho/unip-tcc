/** Load libraries */
require('./libs')

/** Load MongoDB main model */
require('./db/models/person')

/** Load CurrencyApi module */
require('./currencyApi')

/** Load express webserver */
const server = require('./server')

/** Load Websocket */
require('./websocket')(server)

const port = process.env.PORT || 3000

server.listen(port, () => {
	console.info('Server is up on port', port)
})
