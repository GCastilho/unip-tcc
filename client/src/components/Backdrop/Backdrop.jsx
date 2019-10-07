import React from "react";

import './Backdrop.css';

export default props => (
    <div className='backdrop' onClick={props.handle}/>
);