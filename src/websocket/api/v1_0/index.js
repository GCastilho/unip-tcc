/**
 * src/websocket/api/v1_0/loader.js
 *
 * Inicializa todas as rotas do da API v1.0
 */
const fs = require('fs');
const path = require('path');

const subpath = "v1.0/";

module.exports = function (socket, upRota) {

    /*
     * Carrega toda a lista de diretorios da pasta /api/V1_0
     * e carrega cada sub rota de cada versão da api
     */

    fs.readdirSync(path.join(__dirname + "/")).forEach(rota => {
        if (rota != "index.js") { //ignora a si mesmo
            let subLoader = path.join(__dirname + "/" + rota + "/index.js");
            if (fs.existsSync(subLoader))
                require(subLoader)(socket, upRota + subpath);
        }
    })
}