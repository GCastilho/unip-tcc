import React from 'react';
import {Link} from 'react-router-dom';
import {useCookies} from 'react-cookie';

import './Header.css';

import DrawerToggleButton from "../SideDrawer/DrawerToggleButton";
import SideDrawer from "../SideDrawer/SideDrawer";
import Backdrop from "../Backdrop/Backdrop";

export default () => {

    const [sideDrawerOpen, setSideDrawerOpen] = React.useState(false);
    const [cookies,,removeCookie] = useCookies(['sessionID']);
    const [userState, setUserState] = React.useState(cookies.sessionID);

    const drawerToggleHandle = () => {
        setSideDrawerOpen(!sideDrawerOpen);
    };

    const logOutHandle = () => {
        removeCookie('sessionID');
        setUserState(null);
    };

    return (
        <header>
            <nav className='nav-bar'>
                <div className='toggle-button-container'>
                    <DrawerToggleButton handle={drawerToggleHandle}/>
                </div>
                <Link to="/" className="button">Home</Link>
                <div className='header-left'>
                    <Link to="/notfound" className="button">Not Found</Link>
                </div>
                <div className='separator-button'/>
                <div className="header-right">
                    {!userState ?
                        <>
                            <Link to="/login" className="button">Login</Link>
                            < Link to = "/register" className="button">Cadastro</Link>
                        </> :
                        <button className="button" onClick={logOutHandle}>Log out</button>
                    }
                </div>
            </nav>
            <SideDrawer show={sideDrawerOpen}/>
            {sideDrawerOpen ? <Backdrop handle={drawerToggleHandle}/> : null}
        </header>
    )
};