/**
 * client/src/pages/balances/Balances.jsx
 * 
 * User Balances Page
 */
import React, { Component } from 'react';
import socketIOClient from "socket.io-client";
// import axios from 'axios';

import './Balances.css';
import BalancesTableItem from "../../components/BalancesTableItem/BalancesTableItem";
import ReactLoading from "react-loading";


let simu = [];

const socket = socketIOClient({
    endpoint: "http://localhost:3000", // local para connexão (TODO usar caminho relativo)
    response: false
});

console.log("call" + "api/v1.0/test/ping");
socket.emit("api", { route: "api/v1.0/test/ping", data: { status: "ping" } });
/**
 * Rota de request da lista de balances
 *
 * Ex Retorno:
 * {route: "api/v1.0/balances/list", status:"success", data:[
 *  	{ code: "ETH", name: "Etherium", value: "0.00000000" }
 * ]}
 */
console.log("call" + "api/v1.0/balances/list");
socket.emit("api", { route: "api/v1.0/balances/list", data: {} });

// handler do retorno de connexão bem sucedida
socket.on("connected", data => {
    console.log(data);
});

socket.on("disconnect", () => { console.log("Socket desconectado") });
//handlers de falhas de conexão e reconexão ao servidor
socket.on('connect_failed', () => { });
socket.on("connect_error", () => { });
socket.on("reconnect_failed", () => { });


socket.on("reconnect_error", () => { });

socket.on("api", data => {
    console.log(data.data);
    simu = data.data

    // simu = data.data
});

export default class OldBalances extends Component {
    constructor(props) {
        super(props);
        this.state = {
            /**
             * @description Balances on the page (Just to save for posterior use)
             */
            balances: [],
            data: [],
            valued: 0,
            onFocus: false
        };
    }

    componentWillMount() {
        this.setState(prevState => {
            return ( {...prevState, balances: simu})
        })
    }

    componentDidMount() {

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.state.balances !== simu) {
            this.setState(prevState => {
                return ({...prevState, balances: simu})
            })
        }
    }


    /**
     * Função para abrir e fechar as abas
     */
    setFocus(focus) {
        let newState = {onFocus: focus};
        this.setState(newState);
    }

    /**
     * @description create a request for the server to push the balances from user
     */
    loadBalances = () => {
        //need to create a request in here from server
        let recieveData = simu;
        recieveData.forEach(bal => {
            if (bal) {
                let newState = this.state;
                newState.balances.push(bal);
                this.setState(newState);
            }
        });
    };

    /**
     * @description append new data or replace existing one
     * @param item: balance recieve the item for the balance ex. {code,name,balance}
     */
    appendBalance = (item) => {
        let newState = this.state;
        for (let i = 0; i < newState.balances.length; i++) {
            if (newState.balances[i].code === item.code) {
                newState.balances[i].balance = item.balance;
            }
        }
        this.setState(newState);
    };

    /**
     * @description method called from client to make an deposit
     * @param {JSON} item recieve the item for the respective balance ex. {code,name,balance}
     */
    depositBalance(item) {
        /*
         * this need to create an request in the server for deposit the value
         * after the user insert a new value for deposit
         */
        let nitem = item;
        item.value = (parseFloat(item.value) + 0.00000005).toFixed(8);
        this.appendBalance(nitem);
    }

    /**
     * @description method called from client to make an withdraw
     * @param {JSON} item recieve the item for the respective balance ex. {code,name,balance}
     */
    withdrawBalance(item) {
        /*
         * this need to create an request in the server for withdraw the value
         * after the user insert a new value for withdraw
         */
        let nitem = item;
        item.value = (parseFloat(item.value) - 0.00000005).toFixed(8);
        this.appendBalance(nitem);
    }

    render() {
        return (
            <>
                {this.state.balances.length !== 0 ?
                    <div className='table-container' role='table'>
                        <div className='row-group header'>
                            <div className='table-row'>Coin</div>
                            <div className='table-row'>Name</div>
                            <div className='table-row'>Balance</div>
                            <div className='table-row'>Actions</div>
                        </div>
                        {this.state.balances.map((bal) => (
                            <BalancesTableItem
                                key={bal.code}
                                name={bal.name}
                                code={bal.code}
                                value={bal.value}
                                address='bgfgrhrthtyht'
                                focus={this.state.onFocus}
                                setFocus={this.setFocus.bind(this)}
                            />
                        ))}
                    </div>
                    :
                    <ReactLoading className='loading' type='spinningBubbles' color='#fff'/>}

            </>
        )
    }
}