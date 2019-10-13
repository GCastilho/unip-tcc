import React from "react";
import {Link} from "react-router-dom";

import './SideDrawer.css';
import {useCookies} from "react-cookie";

export default props => {
    let showDrawer;

    const [cookies,,removeCookie] = useCookies(['sessionID']);
    const [userState, setUserState] = React.useState(cookies.sessionID);

    const logOutHandle = () => {
        removeCookie('sessionID');
        setUserState(null);
    };

    props.show ? showDrawer = 'side-drawer open' : showDrawer = 'side-drawer';

    return (
        <nav className={showDrawer}>
            <ul>
                <li><Link to="/" className="drawer-button">Home</Link></li>
                {!userState ?
                    <>
                        <li><Link to="/login" className="drawer-button">Login</Link></li>
                        <li><Link to = "/register" className="drawer-button">Cadastro</Link></li>
                    </>:
                    <li><button className="drawer-button" onClick={logOutHandle}>Log out</button></li>
                }
            </ul>
        </nav>
    )
};