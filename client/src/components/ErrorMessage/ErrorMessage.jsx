/*
 * client/src/components/ErrorMessage/ErrorMessage.jsx
 *
 * Mensagem de erro
 */

import React from 'react';

import './ErrorMessage.css';

export default props => (
    <span className='login-error'>{props.message}</span>
);