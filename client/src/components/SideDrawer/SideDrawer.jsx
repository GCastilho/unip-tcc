import React from "react";
import {Link} from "react-router-dom";

import './SideDrawer.css';

export default props => {
    let showDrawer;

    props.show ? showDrawer = 'side-drawer open' : showDrawer = 'side-drawer';

    return (
        <nav className={showDrawer}>
            <ul>
                <li><Link to="/" className="drawer-button">Home</Link></li>
                <li><Link to="/login" className="drawer-button">Login</Link></li>
                <li><Link to="/register" className="drawer-button">Cadastro</Link></li>
            </ul>
        </nav>
    )
};