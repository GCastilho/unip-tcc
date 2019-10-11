import React from 'react';
import {mount, shallow} from 'enzyme';

import Login from '../../pages/login/Login';
import InputField from '../../components/InputField/InputField';
import RoundButton from '../../components/RoundButton/RoundButton';

it('Renders Login page without crashing', () => {
    const wrapper = mount(<Login/>);
    wrapper.unmount();
});

it('Renders two <InputField/> components', () => {
    const wrapper = shallow(<Login/>);
    expect(wrapper.find(InputField)).toHaveLength(2);
});

it('Renders one <RoundButton/> components', () => {
    const wrapper = shallow(<Login/>);
    expect(wrapper.find(RoundButton)).toHaveLength(1);
});

it('state.email it is receive data from input', () => {
    const wrapper = mount(<Login/>);
    wrapper.find('input[name="email"]').simulate('change', {target: {name: 'email',value: 'email@email'}});
    expect(wrapper.state('email')).toEqual('email@email');
    wrapper.unmount();
});

it('state.password it is receive data from input', () => {
    const wrapper = mount(<Login/>);
    wrapper.find('input[name="password"]').simulate('change', {target: {name: 'password',value: '123456'}});
    expect(wrapper.state('password')).toEqual('123456');
    wrapper.unmount();
});