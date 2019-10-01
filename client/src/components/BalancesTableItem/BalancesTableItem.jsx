import React from 'react';

import './BalancesTableItem.css';

/**
 * @description mount a new row with the buttons and the information
 */
export default props => (
    <tr className="balances-tr">
        <td className="balances-td">{props.name}</td>
        <td className="balances-td" id={props.code + "_balance"} > {props.value} </td>
        <td className="balances-td"><div type='button' onClick={props.depositOnClick}>Deposit</div></td>
        <td className="balances-td"><div type='button' onClick={props.withdrawOnClick}>Withdraw</div></td>
    </tr>
)