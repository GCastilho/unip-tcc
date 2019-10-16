/*
 * client/src/components/InputField/InputField.jsx
 */

import React from 'react';

import './InputField.css';

//Input com label flutuante
export default props => (
    <div>
        <div className="input-container">
            <input className="input-user" name={props.name} onChange={props.onChange} type={props.type} required/>
            <label className="label-input">{props.label}</label>
        </div>
    </div>

)