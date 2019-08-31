import React from 'react';
import './Header.css';

export default props => (
    <header>
        <a href="/" className="button">Home</a>
        <a href="/" className="button">Send</a>
        <a href="/" className="button">Receive</a>
        <a href="/test" className="button">test</a>
        <div className="header-right">
            <a href="/login" className="button">Login</a>
            <a href="/cadastro" className="button">Cadastro</a>
        </div>
    </header>
);