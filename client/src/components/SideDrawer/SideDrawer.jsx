/*
 * client/src/components/SideDrawer/SideDrawer.jsx
 */

import React from "react";
import { Link, Redirect } from "react-router-dom";
import { useCookies } from "react-cookie";

import './SideDrawer.css';

export default props => {
    let showDrawer;

    //Variaveis de estado usando React hooks, mesmo efeito que a variavel this.state
    const [cookies,,removeCookie] = useCookies(['sessionID']);
    const [userState, setUserState] = React.useState(cookies.sessionID);
    const [redirect, setRedirect] = React.useState(false);

    //Handle do botão logout, ao aperta-lo ele apaga o cookie, ativa o botão de login e ativa o redirect
    const logOutHandle = () => {
        removeCookie('sessionID');
        setRedirect(true);
        setUserState(null);
    };

    //Faz o redirect ao apertar o botão logout
    const LogoutRedirect = () => {
        if (redirect) {
            setRedirect(false);
            return (
                <Redirect to='/'/>
            );
        } else {
            return null;
        }
    };

    //Condicional para ativar a transição do menu lateral
    props.show ? showDrawer = 'side-drawer open' : showDrawer = 'side-drawer';

    return (
        <nav className={showDrawer}>
            <LogoutRedirect/>
            <ul>
                <li><Link to="/" className="drawer-button">Home</Link></li>
                {userState ?
                    <li><button className="drawer-button" onClick={logOutHandle}>Log out</button></li>
                    :
                    <>
                        <li><Link to="/login" className="drawer-button">Login</Link></li>
                        <li><Link to = "/register" className="drawer-button">Cadastro</Link></li>
                    </>
                }
            </ul>
        </nav>
    )
};