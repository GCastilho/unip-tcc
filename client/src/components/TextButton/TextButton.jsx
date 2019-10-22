/*
 * client/src/components/TextButton/TextButton.jsx
 *
 * link em texto
 */

import React from 'react';

import './TextButton.css';

export default props => (
    <a className="text-button" href={props.href}>{props.label}</a>
)