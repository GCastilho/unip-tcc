/**
 * client/src/pages/balances/Balances.jsx
 * 
 * User Balances Page
 */
import React, { Component } from 'react';
import axios from 'axios';

import './Balances.css';
import BalancesTableItem from "../../components/BalancesTableItem/BalancesTableItem";



let simu = [
    { code: "ETH", name: "Etherium", value: "0.00000000" },
    { code: "BTC", name: "Bitcoin", value: "0.00000000" },
    { code: "NANO", name: "NANO", value: "0.00000000" },
    { code: "USD", name: "Dollar", value: "0.00000000" },
    { code: "USDT", name: "Tether", value: "0.00000000" },
    { code: "LTC", name: "Litecoin", value: "0.00000000" },
    { code: "ETH1", name: "Etherium 1", value: "0.00000000" },
    { code: "BTC1", name: "Bitcoin 1", value: "0.00000000" },
    { code: "NANO1", name: "NANO 1", value: "0.00000000" },
    { code: "USD1", name: "Dollar 1", value: "0.00000000" },
    { code: "USDT1", name: "Tether 1", value: "0.00000000" },
    { code: "LTC1", name: "Litecoin 1", value: "0.00000000" },
    { code: "ETH2", name: "Etherium 2", value: "0.00000000" },
    { code: "BTC2", name: "Bitcoin 2", value: "0.00000000" },
    { code: "NANO2", name: "NANO 2", value: "0.00000000" },
    { code: "USD2", name: "Dollar 2", value: "0.00000000" },
    { code: "USDT2", name: "Tether 2", value: "0.00000000" },
    { code: "LTC2", name: "Litecoin 2", value: "0.00000000" },
    { code: "ETH3", name: "Etherium 3", value: "0.00000000" },
    { code: "BTC3", name: "Bitcoin 3", value: "0.00000000" },
    { code: "NANO3", name: "NANO 3", value: "0.00000000" },
    { code: "USD3", name: "Dollar 3", value: "0.00000000" },
    { code: "USDT3", name: "Tether 3", value: "0.00000000" },
    { code: "LTC3", name: "Litecoin 3", value: "0.00000000" }
];

export default class Balances extends Component {
    constructor() {
        super();

        this.state = {
            /**
             * @description Balances on the page (Just to save for posterior use)
             */
            balances: []
        };
    }

    /**
     * @description create a request for the server to push the balances from user
     */
    loadBalances = () => {
        //need to create a request in here from server
        let recieveData = simu;
        recieveData.forEach(bal => {
            if (bal !== undefined) {
                let newState = this.state;
                newState.balances.push(bal);
                this.setState(newState);
            }
        });
    }

    /**
     * @description append new data or replace existing one
     * @param {JSON} balance recieve the item for the balance ex. {code,name,balance}
     */
    appendBalance = (balance) => {
        let newState = this.state;
        for (let i = 0; i < newState.balances.length; i++) {
            if (newState.balances[i].code === balance.code) {
                newState.balances[i] = balance;
            }
        }
        this.setState(newState);
        console.log(newState);

        /*
        let tr = document.getElementById(balance.code + "_value");
        if (tr !== undefined && tr !== null) {
            tr.innerHTML = balance.value;
        } else {
            let tb = document.getElementById("balancesList");
            if (tb !== undefined) {
                tb.appendChild(this.newRow(balance));
            }

        }
        //*/
    }
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

    /**
     * @description method called after all the rendering is done
     */
    componentDidMount() {
        this.loadBalances();
    }

    render() {
        return (
            <table id='balancesList'>
                <tbody>
                    <tr>
                        <th className="balances-th">Coin</th>
                        <th className="balances-th">Name</th>
                        <th colSpan='2' className="balances-th">Balance</th>
                    </tr>
                    {this.state.balances.map(bal => (<BalancesTableItem key={bal.name} code={bal.code} name={bal.name} value={bal.value}
                        depositOnClick={() => (this.depositBalance(bal))} withdrawOnClick={() => (this.withdrawBalance(bal))} />))}
                </tbody>
            </table >
        )
    }

}