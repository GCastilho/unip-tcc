import React, {Component} from 'react';
import axios from 'axios';

import './Login.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import TextButton from "../../components/TextButton/TextButton";


export default class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            error: false
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    };

    handleChange = (e) => {
        this.setState({
            [e.target.name]: e.target.value
        });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const login = {
            email: this.state.email,
            password: this.state.password
        };

        axios.post('/login', {login}).then(res => {
            console.log('ok')
        }).catch(error => {
            this.setState({error: true})
            console.log(error)
        })
    };

    render() {
        return (
            <div>
                <form className="login-form">
                    <h1>Login</h1>

                    {this.state.error ? <span className='login-error'>Senha ou usuario incorrentos!</span> : null}
                    <InputField label='Usuário' name='email' onChange={this.handleChange} type='email'/>
                    <InputField label='Senha' name='password' onChange={this.handleChange} type='password'/>

                    <div className="forgot-button-container">
                        <TextButton href='/login' label='esqueceu a senha?'/>
                    </div>

                    <RoundButton label='Login' onClick={this.handleSubmit} type='submit'/>
                </form>
            </div>
        )
    }
}