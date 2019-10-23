/**
 * src/websocket/socket.js
 */

module.exports = function (io) {
    //let io = require('socket.io').listen(require('http').createServer(app));

    io.on('connection', function (socket) {
        socket.emit("connected", { status: 1 });
        console.log("Connected client")

        //TODO criar loader de rotas
        socket.on('api', function (data) {
        });
    });

}