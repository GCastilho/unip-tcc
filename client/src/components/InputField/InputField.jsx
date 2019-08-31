import React from 'react';

import './InputField.css';

export default props => (
    <div>
        <div className="input-container">
            <input className="input-user" type={props.type} required={props.required}/>
            <label className="label-input">{props.label}</label>
        </div>
    </div>

)