import React from 'react';
import ReactLoading from 'react-loading';
import { Route, Switch } from 'react-router-dom'

const Login = React.lazy(() => import('./pages/login/Login'));
const Register = React.lazy(() => import('./pages/register/Register'));
const Balances = React.lazy(() => import('./pages/balances/Balances'));

export default () => (
    <React.Suspense fallback={<ReactLoading className='loading' type='spinningBubbles' color='#fff' />}>
        <Switch>
            <Route path='/login'><Login /></Route>
            <Route path='/register'><Register /></Route>
            <Route path='/balances'><Balances /></Route>
        </Switch>
    </React.Suspense>
)
