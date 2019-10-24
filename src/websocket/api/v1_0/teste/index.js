/**
 * src/websocket/api/v1_0/teste/index.js
 * 
 * Rotas da sub rota api/v1.0/teste
 */

const subpath = "test/";

module.exports = function (socket, upRota) {
    //rota de teste para checar se esta correta a conexão





    // MUDAR DE SOCKET PARA MAP OU OUTRA FORMA DE DEFINIR ROTAS



    console.log("-- criado rota: " + upRota + subpath + "ping");
    socket.rotas.set(upRota + subpath + "ping", function (request) {

        /**
         * checa a estrutura para evitar exceptions
         * checa a "data" para saber se retorna a versão e o timestamp
         */

        if (request["data"]["status"]) {
            if (request["data"]["status"] == "ping") {
                request["data"] = {
                    status: "pong",
                    version: "API v1.0",
                    timestamp: new Date().getTime()
                }
                request["status"] = "success";
            }
        } else {
            request = { status: "error", error: "wrong request structure", request: request };
        }

        /**
         * retorna o request modificado com as informações requisitadas
         */
        return request;// é necessario retornar o request;
    })
}