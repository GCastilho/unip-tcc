/*
 * client/src/components/ErrorMessage/ErrorMessage.jsx
 */

import React from 'react';

import './ErrorMessage.css';

//Mensagem de erro
export default props => (
    <span className='login-error'>{props.message}</span>
);