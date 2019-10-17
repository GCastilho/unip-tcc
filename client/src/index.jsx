/*
 * client/src/index.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Cookies } from "react-cookie";

import './index.css';

import Header from './components/Header/Header';
import Routes from './routes';

class App extends React.Component {
    constructor(props) {
        super(props);
        //cria uma variavel para o cookie para que todos os filhos tenham acesso
        this.state = {
            haveCookie: this.cookies.getAll().sessionID !== undefined,
        };
        this.checkCookie = this.checkCookie.bind(this);
    }

    cookies = new Cookies();

    //função para alterar a variavel haveCookie
    checkCookie = (cookie) => {
        this.setState({haveCookie: cookie});
    };

    render() {
        return (
            <BrowserRouter>
                <Header checkCookie={this.checkCookie} haveCookie={this.state.haveCookie}/>
                <div className='home-container'>
                    <Routes checkCookie={this.checkCookie}/>
                </div>
            </BrowserRouter>
        )
    }
}

//Função que inicializa o react
ReactDOM.render(<App/>, document.getElementById('root'));