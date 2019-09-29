import React from 'react';

import './RoundButton.css';

export default props => (
    <button className="round-button" onClick={props.onClick} type={props.type}>{props.label}</button>
)