import React from 'react';
import {Link} from 'react-router-dom';

import './Header.css';

import DrawerToggleButton from "../SideDrawer/DrawerToggleButton";
import SideDrawer from "../SideDrawer/SideDrawer";
import Backdrop from "../Backdrop/Backdrop";

export default props => {

    const [sideDrawerOpen, setSideDrawerOpen] = React.useState(false);

    const drawerToggleHandle = () => {
        setSideDrawerOpen(!sideDrawerOpen);
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
                    <Link to="/login" className="button">Login</Link>
                    <Link to="/register" className="button">Cadastro</Link>
                </div>
            </nav>
            <SideDrawer show={sideDrawerOpen}/>
            {sideDrawerOpen ? <Backdrop handle={drawerToggleHandle}/> : null}
        </header>
    )
};