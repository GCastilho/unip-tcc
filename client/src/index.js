import React from 'react';
import {BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom';
import './index.css';
const Header = React.lazy(() => import('./components/Header/Header'));
const Routes = React.lazy(() => import('./routes'));

ReactDOM.render(
    <BrowserRouter>
        <React.Suspense fallback={<div>Loading...</div>}>
            <Header/>
            <div className='container'>
                <Routes/>
            </div>
        </React.Suspense>
    </BrowserRouter>
    , document.getElementById('root'));