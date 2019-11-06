/**
 * client/src/pages/balances/Balances.jsx
 *
 * User Balances Page
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Cookies, useCookies } from 'react-cookie';
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
socket.emit("api", { route: "api/v1.0/balances/list", data: {} });

// handler do retorno de connexão bem sucedida
socket.on("connected", data => {
    console.log(data);
});


export default props => {

    const [balances, updateBalances] = React.useState([]);
    const [focus, updateFocus] = React.useState(false);
    const [redirect,setRedirect] = React.useState((new Cookies()).getAll().sessionID !== undefined);
    const [cookies] = useCookies(['sessionID']);

    socket.on('disconnect', () => { console.log('Socket desconectado') });
    //handlers de falhas de conexão e reconexão ao servidor
    socket.on('connect_failed', () => { });
    socket.on('connect_error', () => { });

    socket.on("api", data => {
        console.log(data.data);
        if (data.data.status === undefined) {
            console.log('pass');
            updateBalances(data.data);
        }
    });

    React.useEffect(() => {
    },[]);

    /**
     * Função para abrir e fechar as abas
     */
    function setFocus(focus) {
        updateFocus(focus);
    }

    function withdraw() {
        socket.emit('api', { route: 'api/v1.0/test/ping', data: { status: 'ping' } });
        socket.emit('api', { route: 'api/v1.0/balances/withdraw', data: {  } })
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
                            value={bal.value}
                            address={bal.address}
                            focus={focus}
                            setFocus={setFocus}
                        />
                    ))}
                </div>
            }
        </>
    )
}