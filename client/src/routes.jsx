import React from 'react';
import ReactLoading from 'react-loading';
import {Route, Switch} from 'react-router-dom'

const Main = React.lazy(() => import('./pages/main/Main'));
const Login = React.lazy(() => import('./pages/login/Login'));
const Register = React.lazy(() => import('./pages/register/Register'));
const NotFound = React.lazy(() => import('./pages/notFound/NotFound'));

export default () => (
    <React.Suspense fallback={<ReactLoading className='loading' type='spinningBubbles' color='#fff'/>}>
        <Switch>
            <Route exact path='/'><Main/></Route>
            <Route path='/login'><Login/></Route>
            <Route path='/register'><Register/></Route>
            <Route path='*'><NotFound/></Route>
        </Switch>
    </React.Suspense>
)
