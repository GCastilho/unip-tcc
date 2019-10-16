/*
 * client/src/components/RoundButton/RoundButton.jsx
 */

import React from 'react';

import './RoundButton.css';

//Botão com borda arredondada
export default props => (
    <button className="round-button" onClick={props.onClick} type={props.type}>{props.label}</button>
)