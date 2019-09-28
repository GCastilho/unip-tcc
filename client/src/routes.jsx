import React from 'react';
import {Route, Switch} from 'react-router-dom'

const Login = React.lazy(() => import('./pages/login/Login'));
const Register = React.lazy(() => import('./pages/register/Register'));

export default () => (
    <Switch>
        <Route path='/login'><Login/></Route>
        <Route path='/register'><Register/></Route>
    </Switch>
)
