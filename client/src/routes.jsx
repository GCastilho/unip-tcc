import React from 'react';
import {Route, Switch} from 'react-router-dom'

import Login from "./pages/login/Login";
import Register from "./pages/register/Register";

export default () => (
        <Switch>
            <Route path='/login' component={Login}/>
            <Route path='/register' component={Register}/>
        </Switch>
)
