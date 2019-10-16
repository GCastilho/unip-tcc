/*
 * client/src/components/TextButton/TextButton.jsx
 */

import React from 'react';

import './TextButton.css';

//link em texto
export default props => (
    <a className="text-button" href={props.href}>{props.label}</a>
)