/*
 * client/src/pages/notFound/NotFound.jsx
 *
 * Essa pagina será carregada quando um path não registrado no router for acessado
 */

import React from 'react';
import socketIOClient from "socket.io-client";


import './NotFound.css';

const socket = socketIOClient({ endpoint: "http://localhost:3000", response: false });
socket.on("connected", data => { console.log(data) });


export default () => (
    <div>
        <h1>404 - Not Found</h1>
        <h2>The page you requested could not be found</h2>
    </div>
);