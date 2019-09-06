import React from 'react';
import './Header.css';

export default props => (
    <header>
        <a href="/" className="button">Home</a>
        <div className="header-right">
            <a href="/login" className="button">Login</a>
            <a href="/cadastro" className="button">Cadastro</a>
        </div>
    </header>
);