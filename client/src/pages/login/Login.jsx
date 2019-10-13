import React from 'react';
import axios from 'axios';

import './Login.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import TextButton from "../../components/TextButton/TextButton";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";


export default class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            errorMsg: ''
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

        axios.post('/login', {
            email: this.state.email,
            password: this.state.password
        },{headers: {'X-Requested-With': 'XMLHttpRequest'},withCredentials: true}).then(res => {
            window.location.href = res.request.responseURL;
        }).catch(error => {
            if (error.response.status === 401) {
                this.setState({errorMsg: 'Senha ou usuario incorrentos!'});
            } else {
                this.setState({errorMsg: 'Não foi possivel fazer o login'});
            }
            console.log(error.response)
        })
    };

    render() {
        return (
            <div className='login-sing-in-container'>
                <form className='login-form'>
                    <h1>Login</h1>
                    {this.state.errorMsg !== '' ? <ErrorMessage message={this.state.errorMsg}/> : null}
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