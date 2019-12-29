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
    transportOptions: {
        polling: {
            extraHeaders: {
                path: window.location.pathname,
                Authentication: document.cookie.replace(/(?:(?:^|.*;\s*)sessionID\s*=\s*([^;]*).*$)|^.*$/, "$1")
            }
        }
    }
});

export default props => {
    /**
     * Estado e atualização do saldo
     */
    const [balances, updateBalances] = React.useState([]);
    /**
     * Função para abrir e fechar as abas
     */
    const [focus, updateFocus] = React.useState(false);
    const [cookies] = useCookies(['sessionID']);

    // socket.on('disconnect', () => { console.log('Socket desconectado') });

    //handlers de falhas de conexão e reconexão ao servidor
    // socket.on('connect_failed', () => { });
    // socket.on('connect_error', () => { });
    // socket.on('reconnect_failed', () => { });
    // socket.on('reconnect_error', () => { });

    socket.on("connect", () => {
        socket.emit('list', updateBalances)
    })

    React.useEffect(() => {
        socket.emit('authentication', document.cookie.replace(/(?:(?:^|.*;\s*)sessionID\s*=\s*([^;]*).*$)|^.*$/, "$1"))
        socket.emit('_path', window.location.pathname)
        socket.emit('list', updateBalances)
        socket.on('new_transaction', data => {
            console.log('new_transaction:', data);
            socket.emit('list', updateBalances);
        });
    }, [updateBalances])

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
                            address={bal.accounts[0]}
                            withdraw={withdraw}
                            focus={focus}
                            setFocus={updateFocus}
                        />
                    ))}
                </div>
            }
        </>
    )
}
