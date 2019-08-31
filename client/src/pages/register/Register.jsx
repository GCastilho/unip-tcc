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

                    <InputField label='E-mail' type='text' required='true'/>
                    <InputField label='Senha' type='password' required='true'/>

                    <RoundButton label='Cadastrar' type='submit'/>
                </form>
            </div>
        )
    }
}