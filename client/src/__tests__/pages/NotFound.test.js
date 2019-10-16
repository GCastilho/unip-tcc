/*
 * client/src/__tests__/pages/NotFound.test.js
 */

import React from 'react';
import { mount } from 'enzyme';

import NotFound from '../../pages/notFound/NotFound';

it('Renders NotFound page without crashing', () => {
    const wrapper = mount(<NotFound/>);
    wrapper.unmount();
});