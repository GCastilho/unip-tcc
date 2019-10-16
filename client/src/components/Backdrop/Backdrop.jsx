/*
 * client/src/components/Backdrop/Backdrop.jsx
 */

import React from "react";

import './Backdrop.css';

//Tela de fundo preto transparente
export default props => (
    <div className='backdrop' onClick={props.handle}/>
);