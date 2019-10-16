/*
 * client/src/components/SideDrawer/DrawerToggleButton.jsx
 */

import React from "react";

import './DrawerToggleButton.css';

//Botão com os 3 riscos verticais
export default props => (
    <button className='toggle-button' onClick={props.handle}>
        <div className='button-line'/>
        <div className='button-line'/>
        <div className='button-line'/>
    </button>
);