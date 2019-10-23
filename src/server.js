const express = require('express')
const path = require('path')
const app = express();
const http = require('http').createServer(app);
app.io = require('socket.io')(http);

/** Connect to mongodb */
require('./db/mongoose')

/** Load CurrencyApi module */
require('./currencyApi')

/** Load Websocket */
require('./websocket/socket')(app.io);

/** Setup path for react production build and static files */
app.use(express.static(path.join(__dirname, '../public')))

/** Setup router to handle all requests to subdirectories */
app.use(require('./router'))


module.exports = http;
