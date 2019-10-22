/*
 * client/src/components/SideDrawer/SideDrawer.jsx
 */

import React from "react";
import { Link } from "react-router-dom";

import './SideDrawer.css';

export default props => {
    let showDrawer;

    /*
    * Handle do botão logout, ele chama a função de logout e depois fecha o menu lateral
    */
    function handleClick() {
        props.logOutHandle();
        props.handleButton();
    }

    //Condicional para ativar a transição do menu lateral
    props.show ? showDrawer = 'side-drawer open' : showDrawer = 'side-drawer';

    return (
        <nav className={showDrawer}>
            <props.LogoutRedirect/>
            <ul>
                <li><Link to="/" className="drawer-button" onClick={props.handleButton}>Home</Link></li>
                {props.userLogin ?
                    <li><button className="drawer-button" onClick={handleClick}>Log out</button></li>
                    :
                    <>
                        <li><Link to="/login" className="drawer-button" onClick={props.handleButton}>Login</Link></li>
                        <li><Link to = "/register" className="drawer-button" onClick={props.handleButton}>Cadastro</Link></li>
                    </>
                }
            </ul>
        </nav>
    )
};