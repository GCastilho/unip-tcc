import React, {Component} from 'react'

import './Login.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import TextButton from "../../components/TextButton/TextButton";


export default class Login extends Component {
    render() {
        return (
            <div>
                <form className="login-form" method="POST">
                    <h1>Login</h1>

                    <InputField label='Usuário' name='email' type='email'/>
                    <InputField label='Senha' name='password' type='password'/>

                    <div className="forgot-button-container">
                        <TextButton href='/login' label='esqueceu a senha?'/>
                    </div>

                    <RoundButton label='Login' method='post' type='submit'/>
                </form>
            </div>
        )
    }
}