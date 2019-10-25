import React from 'react';

import './BalancesTableItem.css';

/**
 * @description mount a new row with the buttons and the information
 */
export default props => {

    const [valued, setValued] = React.useState(false);
    const [devalued, setDevalued] = React.useState(false);
    const prevValue = usePrevious(props.value);
    let balanceValue;

    React.useEffect(() => {
        if (prevValue === props.value) {
            setValued(false);
            setDevalued(false);
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
    }

    function withdrawHandle() {
        props.withdrawOnClick();
        setValued(false);
        setDevalued(true);
    }

    return (
        <div className='row-group row'>
            <div className='table-row'>{props.code}</div>
            <div className='table-row'>{props.name}</div>
            <div className={'table-row '+balanceValue}>{props.value}</div>
            <div className='table-row'>
                <button className='deposit-button' onClick={depositHandle}>Deposit</button>
                <button className='withdraw-button' onClick={withdrawHandle}>Withdraw</button>
            </div>
        </div>
    )
};