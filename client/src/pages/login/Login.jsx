/*
 * client/src/pages/login/Login.jsx
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Cookies } from 'react-cookie';
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
            redirect: this.cookies.getAll().sessionID !== undefined,
            errorMsg: ''
        };

        //garanti o contexto quando estiver chamando a função com o this
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.LoginRedirect = this.LoginRedirect.bind(this);
    };

    cookies = new Cookies();

    //função para o email e senha do input
    handleChange = (e) => {
        this.setState({
            [e.target.name]: e.target.value
        });
    };

    //função de envio
    handleSubmit = (e) => {
        e.preventDefault();
        axios.post('/login', {
            email: this.state.email,
            password: this.state.password
        }).then(res => {
            //Se o post foi bem sucedido ele fara o redirect
            if (this.cookies.getAll().sessionID !== undefined) {
                this.props.checkCookie(true);
                this.setState({redirect: true});
            } else {
                this.setState({errorMsg: 'Não foi possivel fazer o login'});
            }
        }).catch(error => {
            if (error.response.status === 401) {
                this.setState({errorMsg: 'Usuario ou senha incorretos!'});
            } else {
                this.setState({errorMsg: 'Não foi possivel fazer o login'});
            }
            console.log(error.response)
        })
    };

    //faz o redirect para a home se vc já estiver logado
    LoginRedirect = () => {
        if (this.state.redirect) {
            return (<Redirect to='/'/>)
        } else {
            return null
        }
    };

    render() {
        return (
            <div className='login-sing-in-container'>

                <this.LoginRedirect/>

                <form className='login-form'>
                    <h1>Login</h1>

                    {/* Mensagem de erro só é ativada quando a variavel errorMsg é atualizada com algum dado*/}
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