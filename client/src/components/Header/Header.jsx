import React from 'react';
import {Link} from 'react-router-dom';
import './Header.css';

export default props => {
    return (
        <header>
            <Link to="/" className="button">Home</Link>
            <Link to="/notfound" className="button">Not Found</Link>
            <div className="header-right">
                <Link to="/login" className="button">Login</Link>
                <Link to="/register" className="button">Cadastro</Link>
            </div>
        </header>
    )
};