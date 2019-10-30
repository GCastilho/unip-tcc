/*
 * client/src/__tests__/index.test.js
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { mount } from 'enzyme';

/* Componentes */
import Header from '../components/Header/Header';
import Routes from '../routes';

it('renders site without crashing', () => {
    const wrapper = mount(
        <BrowserRouter>
            <Header/>
            <div className='home-container'>
                <Routes/>
            </div>
        </BrowserRouter>
        );
    wrapper.unmount();
});