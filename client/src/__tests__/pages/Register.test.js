/*
 * client/src/__tests__/pages/Register.test.js
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

/* Componentes */
import Register from '../../pages/register/Register';
import InputField from '../../components/InputField/InputField';
import RoundButton from '../../components/RoundButton/RoundButton';

it('Renders two <InputField/> components', () => {
    const wrapper = shallow(<Register/>);
    expect(wrapper.find(InputField)).toHaveLength(2);
});

it('Renders one <RoundButton/> components on the register page', () => {
    const wrapper = shallow(<Register/>);
    expect(wrapper.find(RoundButton)).toHaveLength(1);
});

it('Renders confirm email page', () => {
    const wrapper = shallow(<Register/>);
    wrapper.setState({emailConfirm: true});
    expect(wrapper.find(RoundButton)).toHaveLength(1);
    expect(wrapper.contains(<h1>Confirme o email</h1>)).toBe(true);
});

it('state.email it is receive data from input', () => {
    const wrapper = mount(<Register/>);
    wrapper.find('input[name="email"]').simulate('change', {target: {name: 'email',value: 'email@email'}});
    expect(wrapper.state('email')).toEqual('email@email');
    wrapper.unmount();
});

it('state.password it is receive data from input', () => {
    const wrapper = mount(<Register/>);
    wrapper.find('input[name="password"]').simulate('change', {target: {name: 'password',value: '123456'}});
    expect(wrapper.state('password')).toEqual('123456');
    wrapper.unmount();
});