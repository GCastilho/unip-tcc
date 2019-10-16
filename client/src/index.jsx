/*
 * client/src/index.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

import Header from './components/Header/Header';
import Routes from './routes';

class App extends React.Component {
    render() {
        return (
            <BrowserRouter>
                <Header/>
                <div className='home-container'>
                    <Routes/>
                </div>
            </BrowserRouter>
        )
    }
}

//Função que inicializa o react
ReactDOM.render(<App/>, document.getElementById('root'));