/**
 * src/websocket/api/v1_0/teste/_withdraw.js
 * rota de saque de moedas
 */
module.exports = function (socket, upRota) {
    if (socket.enableLog) console.log("-- criado rota: " + upRota + "get");
    socket.rotas.set(upRota + "get", function (request) {
        /**
         * TODO: Withdraw
         */

        /**
         * retorna o request modificado com as informações requisitadas
         */
        return request;// é necessario retornar o request;
    })
}