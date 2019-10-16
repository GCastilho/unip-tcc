/*
 * client/src/pages/main/Main.jsx
 */

import React from 'react';

import './Main.css';
import imgTest from '../../assets/img/imagemTeste.jpg';

//Por enquanto pagina só gera um html estatico
export default () => (
    <div className='main-container'>
        <section className='a'>
            <h1>This is the main page</h1>
        </section>
        <section className='b'>
            <div className='text-container'>
                <img src={imgTest} alt='test'/>
            </div>
            <div className='text-container'>
                <h3>Neque porro quisquam est qui dolorem</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ac blandit libero.
                    Donec vitae risus ac ligula convallis eleifend. Praesent in purus tincidunt, volutpat odio elementum,
                    tempus ex. Suspendisse et massa in ipsum interdum aliquam. </p>
            </div>
        </section>
        <section className='c'>
            <div className='text-container'>
                <h3>Neque porro quisquam est qui dolorem</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ac blandit libero.
                    Donec vitae risus ac ligula convallis eleifend. Praesent in purus tincidunt, volutpat odio elementum,
                    tempus ex. Suspendisse et massa in ipsum interdum aliquam. </p>
            </div>
            <div className='text-container'>
                <img src={imgTest} alt='test'/>
            </div>
        </section>
        <section className='d'>
            <div className='text-container'>
                <h3>Neque porro quisquam est qui dolorem</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ac blandit libero.
                    Donec vitae risus ac ligula convallis eleifend. Praesent in purus tincidunt, volutpat odio elementum,
                    tempus ex. Suspendisse et massa in ipsum interdum aliquam. </p>
            </div>
            <div className='text-container'>
                <h3>Neque porro quisquam est qui dolorem</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ac blandit libero.
                    Donec vitae risus ac ligula convallis eleifend. Praesent in purus tincidunt, volutpat odio elementum,
                    tempus ex. Suspendisse et massa in ipsum interdum aliquam. </p>
            </div>
        </section>
    </div>
);