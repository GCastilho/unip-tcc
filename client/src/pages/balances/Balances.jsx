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
    endpoint: 'http://'+window.location.host,
    response: false
});

let socketConnect = false;

/* call de uma rota de teste da API v1.0
 * OBS: o call precisa ser feito posterior a declaração do handler do retorno
 * OBS2: necessario verificar estado da connexão do socket antes do envio ou tratar a exception
 */
socket.emit("api", { route: "api/v1.0/test/ping", data: { status: "ping" } });

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

    React.useEffect(() => {
        if (socketConnect) {
            socket.emit('api', { route: 'api/v1.0/balances/list', data: { email: props.email } });
        }
        socket.on("connected", data => {
            console.log(data);
            if (data.status === 'online') {
                /**
                 * Rota de request da lista de balances
                 *
                 * Ex Retorno:
                 * {route: "api/v1.0/balances/list", status:"success", data:[
                 *  	{ code: "ETH", name: "Etherium", value: "0.00000000", address: "" }
                 * ]}
                 */
                socket.emit('api', {route: 'api/v1.0/balances/list', data: {email: props.email}});
                socketConnect = true;
            }
        });
        socket.on('new_transaction', data => {
            console.log(data);
            if (data.email === props.email) {
                socket.emit('api', {route: 'api/v1.0/balances/list', data: {email: props.email}});
            }
        });

        /**
         * handler de retorno de resposta da api
         * estrutura do JSON:
         * {route:"api/v1.0/...", data:{...}}
         * "route" sendo a rota de chamamento
         * "data" os dados de retorno da api
         * "status" string contendo o status do chamado "success" ou "error"
         */
        socket.on('api', setBalance);
    },[props, setBalance]);

    function setBalance(data) {
        if (data.route === 'api/v1.0/balances/list') {
            console.log(data);
            setTimeout((() => updateBalances(data.data)),5000);
        }
        if (data.route === 'api/v1.0/balances/withdraw') {
            console.log(data);
            socket.emit('api', {route: 'api/v1.0/balances/list', data: {email: props.email}})
        }
    }

    /**
     * Função para abrir e fechar as abas
     */
    function setFocus(focus) {
        updateFocus(focus);
    }

    /**
     * Função de saque da pagina
     */
    function withdraw(currency, address, amount) {
        socket.emit('api', { route: 'api/v1.0/balances/withdraw', data: { address: address, amount: amount, currency: currency, email: props.email } })
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