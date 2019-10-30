import React from 'react';
import QRCode from 'qrcode.react';

import './BalancesTableItem.css';

/**
 * @description mount a new row with the buttons and the information
 */
export default props => {

    const [valued, setValued] = React.useState(false);
    const [devalued, setDevalued] = React.useState(false);
    const [deposit, setDeposit] = React.useState(false);
    const [withdraw, setWithdraw] = React.useState(false);

    const prevValue = usePrevious(props.value);
    let balanceValue;
    let depositShow;
    let withdrawShow;

    React.useEffect(() => {
        if (prevValue === props.value) {
            setValued(false);
            setDevalued(false);
            setDeposit(false);
            setWithdraw(false);
        }
    },[prevValue, props.value]);

    function usePrevious(value) {
        const ref = React.useRef();
        React.useEffect(() => {
            ref.current = value;
        });
        return ref.current;
    }

    if (!valued && !devalued) {
        balanceValue = '';
    } else if (valued) {
        balanceValue = 'balances-valued';
    } else if (devalued) {
        balanceValue = 'balances-devalued';
    }

    function depositHandle() {
        props.depositOnClick();
        setValued(true);
        setDevalued(false);
        setDeposit(true);
        setWithdraw(false);
    }

    function withdrawHandle() {
        props.withdrawOnClick();
        setValued(false);
        setDevalued(true);
        setDeposit(false);
        setWithdraw(true);
    }

    deposit ? depositShow = 'drawer-container' : depositShow = 'drawer-container hide';
    withdraw ? withdrawShow = 'drawer-container' : withdrawShow = 'drawer-container hide';

    return (
        <>
            <div className='row-group row'>
                <div className='table-row'>{props.code}</div>
                <div className='table-row'>{props.name}</div>
                <div className={'table-row '+balanceValue}>{props.value}</div>
                <div className='table-row'>
                    <button className='deposit-button' onClick={depositHandle}>Deposit</button>
                    <button className='withdraw-button' onClick={withdrawHandle}>Withdraw</button>
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
                    <h5>Você tem {props.value} {props.code} disponiveis para saque :</h5>
                    <div className='withdraw-address-container'>
                        <div className='withdraw-address'>
                            <label>Endereço : </label><input/>
                        </div>
                        <div className='withdraw-address'>
                            <label>Montante : </label><input type='number' step='0,01' max={props.value}/>
                        </div>
                    </div>
                    <div className='withdraw-button-container'>
                        <button>Saque</button>
                    </div>
                </div>
            </div>
        </>
    )
};