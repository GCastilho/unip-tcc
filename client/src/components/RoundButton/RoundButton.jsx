import React from 'react';

import './RoundButton.css';

export default props => (
    <button className="round-button" type={props.type} formMethod={props.method}>{props.label}</button>
)