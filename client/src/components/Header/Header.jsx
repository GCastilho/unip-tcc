/*
 * client/src/components/Header/Header.jsx
 */

import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import { useCookies } from 'react-cookie';

import './Header.css';

import DrawerToggleButton from "../SideDrawer/DrawerToggleButton";
import SideDrawer from "../SideDrawer/SideDrawer";
import Backdrop from "../Backdrop/Backdrop";

export default () => {

    //Variaveis de estado usando React hooks, mesmo efeito que a variavel this.state
    const [sideDrawerOpen, setSideDrawerOpen] = React.useState(false);
    const [cookies,,removeCookie] = useCookies(['sessionID']);
    const [userState, setUserState] = React.useState(cookies.sessionID !== undefined);
    const [redirect, setRedirect] = React.useState(false);

    //função para abrir o menu lateral 'usado somente no modo mobile'
    const drawerToggleHandle = () => {
        setSideDrawerOpen(!sideDrawerOpen);
    };

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

    return (
        <header>
            <nav className='nav-bar'>

                <LogoutRedirect/>

                {/* Botão mostrado somente quando a tela tem uma largura minima de 769px */}
                <div className='toggle-button-container'>
                    <DrawerToggleButton handle={drawerToggleHandle}/>
                </div>

                <Link to="/" className="button">Home</Link>
                <div className='header-left'>
                    <Link to="/notfound" className="button">Not Found</Link>
                </div>
                <div className='separator-button'/>
                <div className="header-right">
                    {/* Faz o check se há ou não um cookie, se tiver um cookie ele mostrara o botão de logout*/}
                    {userState ?
                        <button className="button" onClick={logOutHandle}>Log out</button>
                        :
                        <>
                            <Link to="/login" className="button">Login</Link>
                            < Link to = "/register" className="button">Cadastro</Link>
                        </>
                    }
                </div>
            </nav>

            {/* Carrega o menu lateral */}
            <SideDrawer show={sideDrawerOpen}/>
            {sideDrawerOpen ? <Backdrop handle={drawerToggleHandle}/> : null}
        </header>
    )
};