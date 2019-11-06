import React from 'react';
import QRCode from 'qrcode.react';

import './BalancesTableItem.css';

/**
 * @description mount a new row with the buttons and the information
 */
export default props => {

    const [deposit, setDeposit] = React.useState(false);
    const [withdraw, setWithdraw] = React.useState(false);
    const [address, setAddress] = React.useState('');
    const [amount, setAmount] = React.useState('');

    let depositShow;
    let withdrawShow;

    React.useEffect(() => {
        if (props.focus) {
            setDeposit(false);
            setWithdraw(false);
            props.setFocus(false);
        }
    },[props]);

    /**
     * Handle do botão 'deposito', abre a aba deposito
     */
    function depositHandle() {
        // Fecha as outras abas abertas
        props.setFocus(true);

        setTimeout(() => {
            props.setFocus(false);
            setDeposit(true);
        },1);
    }

    /**
     * Handle do botão 'sacar', abre a aba sacar
     */
    function withdrawHandle() {
        // Fecha as outras abas abertas
        props.setFocus(true);

        setTimeout(() => {
            props.setFocus(false);
            setWithdraw(true);
        },1)
    }

    /**
     * @description Handle do input do amount
     * @param e: recebe um evento do input
     */
    function amountHandle(e) {
        /** test1: ele testa se o input somente um ponto ou uma virgula*/
        let test1 = /^([1-9]\d*([.,])\d*|0?([.,])\d*[1-9]\d*|[1-9]\d*)$/gm;
        /** test2: ele testa se os primeiros 2 digitos são '0.' ou '0,'*/
        let test2 = /^[0](([.,])?|0?([.,])\d*)$/gm;

        if (test1.test(e.target.value) ||
            test2.test(e.target.value)) {
            // Substitui as virgulas por pontos
            let newAmount = e.target.value.replace(/[,]/g, m => (m === ',' ? '.' : ','));

            // Compara se o valor digitado é maior que a quantidade na carteira
            if (newAmount > props.value) {

                // Se for maior o valor do input é mudado para a quantidade na carteira
                e.target.value = props.value;
                setAmount(props.value);

            } else {
                setAmount(newAmount);
            }
        } else {
            // Impedi que o usuario digite algum valor invalido
            e.target.value = e.target.value.substring(0, e.target.value.length - 1);
        }
    }

    /**
     * Handle do input do address
     */
    function addressHandle(e) {
        setAddress(e.target.value);
    }

    /**
     * Handle do botão de saque
     * ainda precisa ser implementado
     */
    function withdrawButtonHandle() {
        console.log(address);
        console.log(amount);
        props.withdraw(address, amount);
    }

    deposit ? depositShow = 'drawer-container' : depositShow = 'drawer-container hide';
    withdraw ? withdrawShow = 'drawer-container' : withdrawShow = 'drawer-container hide';

    return (
        <>
            <div className='row-group row'>
                <div className='table-row'>{props.code.toUpperCase()}</div>
                <div className='table-row'>{props.name}</div>
                <div className='table-row'>{props.value}</div>
                <div className='table-row'>
                    <button className='deposit-button' onClick={depositHandle}>Deposit</button>
                    <button className='withdraw-button' onClick={withdrawHandle} >Withdraw</button>
                </div>
            </div>
            <div className={depositShow}>
                <div className='deposit-container'>
                    <div className='left-div'>
                        <h5>Seu endereço de deposito:</h5>
                        <div className='deposit-address'>
                            <p>{props.address}</p>
                        </div>
                    </div>

                    <div className='right-div'>
                        <div className='qr-container'>
                            <QRCode
                                value={props.name.toLowerCase()+':'+props.address}
                                renderAs='svg'
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className={withdrawShow}>
                <div className='withdraw-container'>
                    <h5>Você tem {props.value} {props.code.toUpperCase()} disponiveis para saque :</h5>
                    <div className='withdraw-address-container'>
                        <div className='withdraw-address'>
                            <label style={{marginLeft: '4px'}}>Endereço : </label><input onChange={addressHandle}/>
                        </div>
                        <div className='withdraw-address'>
                            <label>Montante : </label><input onChange={amountHandle} />
                        </div>
                    </div>
                    <div className='withdraw-button-container'>
                        <button onClick={withdrawButtonHandle}>Saque</button>
                    </div>
                </div>
            </div>
        </>
    )
};