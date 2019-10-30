/*
 * client/src/components/SideDrawer/DrawerToggleButton.jsx
 *
 * Botão com os 3 barras verticais
 */

import React from "react";

import './DrawerToggleButton.css';

export default props => (
    <button className='toggle-button' onClick={props.handle}>
        <div className='button-line'/>
        <div className='button-line'/>
        <div className='button-line'/>
    </button>
);