import React from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom'

import Login from "./pages/login/Login";
import Test from "./pages/test/test";
import Register from "./pages/register/Register";

export default () => (
    <BrowserRouter>
        <Switch>
            <Route path='/login' component={Login}/>
            <Route path='/test' component={Test}/>
            <Route path='/cadastro' component={Register}/>
        </Switch>
    </BrowserRouter>
)
