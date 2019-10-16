/*
 * client/src/pages/notFound/NotFound.jsx
 */

import React from 'react';

import './NotFound.css';

//Essa pagina será carregada quando um path não registrado no router for acessado
export default () => (
    <div>
        <h1>404 - Not Found</h1>
        <h2>The page you requested could not be found</h2>
    </div>
);