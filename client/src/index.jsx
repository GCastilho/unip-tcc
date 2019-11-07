/*
 * client/src/index.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Cookies } from "react-cookie";

// Assets
import './index.css';

// Componentes
import Header from './components/Header/Header';
import Routes from './routes';

class App extends React.Component {
    constructor(props) {
        super(props);
        /** Cria uma variavel para o cookie para que todos os filhos tenham acesso */
        this.state = {
            email: '',
            haveCookie: false,
        };
        this.checkCookie = this.checkCookie.bind(this);
    }

    cookies = new Cookies();

    componentDidMount() {
        if (this.cookies.getAll().sessionID) {
            this.cookies.remove('sessionID');
        }
    }

    /** Função para alterar a variavel haveCookie */
    checkCookie = (cookie) => {
        this.setState({haveCookie: cookie});
    };

    setEmail = (email) => {
        this.setState({email: email});
    };

    render() {
        return (
            <BrowserRouter>
                <Header checkCookie={this.checkCookie} haveCookie={this.state.haveCookie}/>
                <div className='home-container'>
                    <Routes
                        checkCookie={this.checkCookie}
                        setEmail={this.setEmail}
                        email={this.state.email}
                    />
                </div>
            </BrowserRouter>
        )
    }
}

/** Função que inicializa o react */
ReactDOM.render(<App/>, document.getElementById('root'));