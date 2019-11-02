/*
 * client/src/pages/notFound/NotFound.jsx
 *
 * Essa pagina será carregada quando um path não registrado no router for acessado
 */

import React from 'react';
import socketIOClient from "socket.io-client";


import './NotFound.css';

const socket = socketIOClient({
	endpoint: "http://localhost:3000", // local para connexão (TODO usar caminho relativo)
	response: false
});

// handler do retorno de connexão bem sucedida
socket.on("connected", data => {
	console.log(data);
});
socket.on("disconnect", () => { console.log("Socket desconectado") });

//handlers de falhas de conexão e reconexão ao servidor
socket.on('connect_failed', () => { });
socket.on("connect_error", () => { });
socket.on("reconnect_failed", () => { });
socket.on("reconnect_error", () => { });


/** 
 * handler de retorno de resposta da api
 * estrutura do JSON:
 * {route:"api/v1.0/...", data:{...}}
 * "route" sendo a rota de chamamento
 * "data" os dados de retorno da api
 * "status" string contendo o status do chamado "success" ou "error"
 */
socket.on("api", data => { console.log(data) });

/* call de uma rota de teste da API v1.0
 * OBS: o call precisa ser feito posterior a declaração do handler do retorno
 * OBS2: necessario verificar estado da connexão do socket antes do envio ou tratar a exception
 */
setTimeout(() => { // criando o call 500ms depois do carregamento da pagina
	console.log("call" + "api/v1.0/test/ping");
	socket.emit("api", { route: "api/v1.0/test/ping", data: { status: "ping" } })
	/**
	 * Rota de request da lista de balances
	 * 
	 * Ex Retorno:
	 * {route: "api/v1.0/balances/list", status:"success", data:[
	 *  	{ code: "ETH", name: "Etherium", value: "0.00000000" }
	 * ]}
	 */
	console.log("call" + "api/v1.0/balances/list");
	socket.emit("api", { route: "api/v1.0/balances/list", data: {} })
}, 500);

export default () => (
	<div>
		<h1>404 - Not Found</h1>
		<h2>The page you requested could not be found</h2>
	</div>
);
