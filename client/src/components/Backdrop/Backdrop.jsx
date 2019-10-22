/*
 * client/src/components/Backdrop/Backdrop.jsx
 *
 * Tela de fundo preto transparente
 */

import React from "react";

import './Backdrop.css';

export default props => (
    <div className='backdrop' onClick={props.handle}/>
);