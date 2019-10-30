/**
 * client/src/pages/balances/Balances.jsx
 * 
 * User Balances Page
 */
import React, { Component } from 'react';
// import axios from 'axios';

import './Balances.css';
import BalancesTableItem from "../../components/BalancesTableItem/BalancesTableItem";


let simu = [
    { code: "ETH", name: "Etherium", value: "1.00000000", address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2' },
    { code: "BTC", name: "Bitcoin", value: "1.00000000", address: '0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413' },
    { code: "NANO", name: "NANO", value: "1.00000000", address: 'xrb_3njakob6iz67oi5cfade3etoremah35wsdei6n6qnjrdhrjgj45kwhqotc85' }
];

export default class Balances extends Component {
    constructor(props) {
        super(props);
        this.state = {
            /**
             * @description Balances on the page (Just to save for posterior use)
             */
            balances: simu,
            valued: 0,
        };
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
                        address={bal.address}
                        depositOnClick={() => this.depositBalance(bal)}
                        withdrawOnClick={() => this.withdrawBalance(bal)}
                    />
                ))}
            </div>
        )
    }
}