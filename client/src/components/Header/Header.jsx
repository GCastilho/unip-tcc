/*
 * client/src/components/Header/Header.jsx
 */

/* Modulos externos */
import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import { useCookies } from 'react-cookie';

/* Assets */
import './Header.css';

/* Componentes */
import DrawerToggleButton from "../SideDrawer/DrawerToggleButton";
import SideDrawer from "../SideDrawer/SideDrawer";
import Backdrop from "../Backdrop/Backdrop";

export default (props) => {

    /*
    * Variaveis de estado usando React hooks, mesmo efeito que a variavel this.state
    */
    const [sideDrawerOpen, setSideDrawerOpen] = React.useState(false);
    const [cookies,,removeCookie] = useCookies(['sessionID']);
    const [userLogin, setUserLogin] = React.useState(cookies.sessionID !== undefined);
    const [redirect, setRedirect] = React.useState(false);

    /* A função useEffect é chamada toda vez que um estado é atualizado */
    React.useEffect(() => {
        /* Atualiza o estado do login sempre que o cookie for atualizado */
        if(props.haveCookie) {
            setUserLogin(true)
        }
    },[props.haveCookie]);

    /* função para abrir o menu lateral 'usado somente no modo mobile' */
    const drawerToggleHandle = () => {
        setSideDrawerOpen(!sideDrawerOpen);
    };

    /* Handle do botão logout, ao aperta-lo ele apaga o cookie, ativa o botão de login e ativa o redirect */
    const logOutHandle = () => {
        removeCookie('sessionID');
        setRedirect(true);
        /* Muda o estado da classe pai para false
        * para evitar a criação de um loop de erros no useEffect */
        props.checkCookie(false);
        setUserLogin(false);
    };

    /* Faz o redirect ao apertar o botão logout */
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
                    {userLogin ?
                        <button className="button" onClick={logOutHandle}>Log out</button>
                        :
                        <>
                            <Link to="/login" className="button">Login</Link>
                            < Link to = "/register" className="button">Cadastro</Link>
                        </>
                    }
                </div>
            </nav>

            {/* Carrega o menu lateral, passando as funções do header */}
            <SideDrawer
                show={sideDrawerOpen}
                handleButton={drawerToggleHandle}
                LogoutRedirect={LogoutRedirect}
                logOutHandle={logOutHandle}
                userLogin={userLogin}
            />
            {sideDrawerOpen ? <Backdrop handle={drawerToggleHandle}/> : null}
        </header>
    )
};