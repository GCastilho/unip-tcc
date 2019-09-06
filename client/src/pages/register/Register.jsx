import React, {Component} from 'react';

import './Register.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";

export default class Register extends Component {
    render() {
        return (
            <div>
                <form className="register-form" method="POST">
                    <h1>Cadastro</h1>

                    <InputField label='E-mail' name='email' type='email'/>
                    <InputField label='Senha' name='password' type='password'/>

                    <RoundButton label='Cadastrar' method='post' type='submit'/>
                </form>
            </div>
        )
    }
}