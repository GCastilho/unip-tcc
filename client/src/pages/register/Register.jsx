import React, {Component} from 'react';
import axios from 'axios';

import './Register.css';
import InputField from "../../components/InputField/InputField";
import RoundButton from "../../components/RoundButton/RoundButton";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";

export default class Register extends Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            emailConfirm: false,
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
        if (this.state.email.search(
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/) === -1) {
            this.setState({errorMsg: 'E-mail inválido'});
        } else {
            axios.post('/register', {email: this.state.email, password: this.state.password})
            .then(res => {
                console.log(res);
                if (res.data.code === 11000) {
                    this.setState({errorMsg: 'Já existe um usuário cadastrado com o e-mail informado'});
                } else {
                    this.setState({email: res.data.email, emailConfirm: true, errorMsg: ''})
                }
            }).catch(error => {
                console.log(error);
                this.setState({errorMsg: 'Não foi possivel fazer o cadastro no momento'})
            })
        }
    };


    render() {
        return (
            <div className='login-sing-in-container'>
                {this.state.emailConfirm === false ?
                    <form className="register-form">
                        <h1>Cadastro</h1>

                        {this.state.errorMsg !== '' ? <ErrorMessage message={this.state.errorMsg}/> : null}
                        <InputField label='E-mail' name='email' onChange={this.handleChange} type='email'/>
                        <InputField label='Senha' name='password' onChange={this.handleChange} type='password'/>

                        <RoundButton label='Cadastrar' onClick={this.handleSubmit} type='submit'/>
                    </form> :
                    <div className='confirmWindow'>
                        <h1>Confirme o email</h1>
                        <p>Enviamos um email de confirmação de cadastro para <b>{this.state.email}</b>,
                        <br/>para ativar sua conta por favor siga as instruções informadas no email</p>
                        <div>
                            <RoundButton label='Confirmar e-mail'/> {/*função ainda precissa ser implementado*/}
                        </div>
                    </div>
                }
            </div>
        )
    }
}