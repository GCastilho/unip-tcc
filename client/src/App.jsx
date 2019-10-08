import React from 'react';
import {BrowserRouter} from 'react-router-dom';

import './App.css';

import Header from './components/Header/Header';
import Routes from './routes';

export default () => (
    <BrowserRouter>
        <Header/>
        <div className='home-container'>
            <Routes/>
        </div>
    </BrowserRouter>
);