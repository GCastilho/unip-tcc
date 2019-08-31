import React, {Component} from 'react'

import './Login.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import TextButton from "../../components/TextButton/TextButton";


export default class Login extends Component {
    constructor(props) {
        super(props);
        Login.handleSubmit = Login.handleSubmit.bind(this);
    }

    static handleSubmit(event) {
        event.preventDefault();
    }


    render() {
        return (
            <div>
                <form className="login-form" onSubmit={Login.handleSubmit}>
                    <h1>Login</h1>

                    <InputField label='Usuário' type='text' required='true'/>
                    <InputField label='Senha' type='password' required='true'/>

                    <div className="forgot-button-container">
                        <TextButton href='/login' label='esqueceu a senha?'/>
                    </div>

                    <RoundButton label='Login'/>
                </form>
            </div>
        )
    }
}