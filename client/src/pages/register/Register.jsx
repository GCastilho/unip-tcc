/*
 * client/src/pages/register/Register.jsx
 */

/* Modulos externos */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Cookies } from 'react-cookie';
import axios from 'axios';

/* Assets */
import './Register.css';

/* Componentes */
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";

export default class Register extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            emailConfirm: false,
            redirect: this.cookies.getAll().sessionID !== undefined,
            errorMsg: ''
        };

        /* garante o contexto quando estiver chamando a função com o this */
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.SignupRedirect = this.SignupRedirect.bind(this);
    };

    cookies = new Cookies();

    /* função para o email e senha do input */
    handleChange = (e) => {
        this.setState({
            [e.target.name]: e.target.value
        });
    };

    /* função de envio */
    handleSubmit = (e) => {
        e.preventDefault();

        /* Checa se o email é um email valido ou não */
        if (this.state.email.search(
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/) === -1) {
            this.setState({errorMsg: 'E-mail inválido'});
        } else {
            axios.post('/register', {email: this.state.email, password: this.state.password})
            .then(res => {
                //Quando o cadastro foi bem sucedido, ele muda para a tela de confirmação
                this.setState({email: res.data.email, emailConfirm: true, errorMsg: ''});
            }).catch(err => {
                if (err.response.status === 409) {
                    this.setState({errorMsg: 'Já existe um usuário cadastrado com o e-mail informado'});
                } else {
                    this.setState({errorMsg: err.response.statusText});
                }
            })
        }
    };

    /* faz o redirect para a home se vc já estiver logado */
    SignupRedirect = () => {
        if (this.state.redirect) {
            return (<Redirect to='/'/>)
        } else {
            return null
        }
    };

    render() {
        return (
            <div className='login-sing-in-container'>

                <this.SignupRedirect/>

                {this.state.emailConfirm === false ?
                    <form className="register-form">
                        <h1>Cadastro</h1>

                        {/* Mensagem de erro só é ativada quando a variavel errorMsg é atualizada com algum dado */}
                        {this.state.errorMsg !== '' ? <ErrorMessage message={this.state.errorMsg}/> : null}

                        <InputField label='E-mail' name='email' onChange={this.handleChange} type='email'/>
                        <InputField label='Senha' name='password' onChange={this.handleChange} type='password'/>

                        <RoundButton label='Cadastrar' onClick={this.handleSubmit} type='submit'/>
                    </form> :

                    /* Tela ativada quando o cadastro é bem sucedido */
                    <div className='confirmWindow'>
                        <h1>Confirme o email</h1>
                        <p>Enviamos um email de confirmação de cadastro para <b>{this.state.email}</b>,
                        <br/>para ativar sua conta por favor siga as instruções informadas no email</p>
                        <div>
                            <RoundButton label='Confirmar e-mail'/> {/*função ainda precisa ser implementado*/}
                        </div>
                    </div>
                }
            </div>
        )
    }
}
