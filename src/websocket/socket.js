/**
 * src/websocket/socket.js
 * 
 * handler do socket
 */

module.exports = function (io) {
    io.on('connection', function (socket) {

        // Load Socket routes (pode ser chamado só apos verificação de autenticação)
        require('./api-loader')(socket);

        //emitir sucesso na connexão somente quando as rotas forem criadas
        socket.emit("connected", { status: "online" });
        console.log("Novo Cliente Conectado")
    });

}