/**
 * client/src/pages/balances/Balances.jsx
 *
 * User Balances Page
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import socketIOClient from "socket.io-client";

import './Balances.css';
import BalancesTableItem from "../../components/BalancesTableItem/BalancesTableItem";
import ReactLoading from "react-loading";

const socket = socketIOClient({
    endpoint: "http://localhost:3000", // local para connexão (TODO usar caminho relativo)
    response: false
});

socket.emit("api", { route: "api/v1.0/test/ping", data: { status: "ping" } });


/**
 * Rota de request da lista de balances
 *
 * Ex Retorno:
 * {route: "api/v1.0/balances/list", status:"success", data:[
 *  	{ code: "ETH", name: "Etherium", value: "0.00000000" }
 * ]}
 */

// handler do retorno de connexão bem sucedida
socket.on("connected", data => {
    console.log(data);
    if (data.status === 'online')
        socket.emit("api", { route: "api/v1.0/balances/list", data: { email: 'joaojvdsvictor@gmail.com' } });
});

socket.on('new_transaction', data => {
    console.log(data);
});

export default props => {

    const [balances, updateBalances] = React.useState([]);
    const [focus, updateFocus] = React.useState(false);
    const [cookies] = useCookies(['sessionID']);




    socket.on('disconnect', () => { console.log('Socket desconectado') });
    //handlers de falhas de conexão e reconexão ao servidor
    socket.on('connect_failed', () => { });
    socket.on('connect_error', () => { });
    socket.on('reconnect_failed', () => { });
    socket.on('reconnect_error', () => { });


    function updateBalance(data) {
        console.log(data);
        if (data.route === 'api/v1.0/balances/list') {
            console.log(data.data);
            updateBalances(data.data);
        }
    }

    React.useEffect(() => {
        socket.on('api', updateBalance)
    },[balances]);

    /**
     * Função para abrir e fechar as abas
     */
    function setFocus(focus) {
        updateFocus(focus);
    }

    function withdraw(address, amount) {
        socket.emit('api', { route: 'api/v1.0/balances/withdraw', data: { email: props.email, address: address, amount: amount } })
    }

    return (
        <>
            {cookies.sessionID ? null : <Redirect to='/'/>}
            {balances.length === 0 ?
                <ReactLoading className='loading' type='spinningBubbles' color='#fff'/>
                :
                <div className='table-container' role='table'>
                    <div className='row-group header'>
                        <div className='table-row'>Coin</div>
                        <div className='table-row'>Name</div>
                        <div className='table-row'>Balance</div>
                        <div className='table-row'>Actions</div>
                    </div>
                    {balances.map((bal) => (
                        <BalancesTableItem
                            key={bal.code}
                            name={bal.name}
                            code={bal.code}
                            value={bal.balance}
                            address={bal.address[0]}
                            withdraw={withdraw}
                            focus={focus}
                            setFocus={setFocus}
                        />
                    ))}
                </div>
            }
        </>
    )
}