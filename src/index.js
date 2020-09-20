/** Load libraries */
require('./libs/extensions')

/** Load MongoDB main model */
require('./db/models/person')

/** Load CurrencyApi module */
require('./currencyApi')

/** Load MarketApi module */
require('./marketApi')

/** Load http server */
require('./server')
