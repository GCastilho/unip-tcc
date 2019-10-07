import React from 'react';
import {BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom';

import './index.css';

import Header from './components/Header/Header';
import Routes from './routes';

ReactDOM.render(
    <BrowserRouter>
        <Header/>
        <div className='home-container'>
            <Routes/>
        </div>
    </BrowserRouter>
    , document.getElementById('root'));