/*
 * client/src/__tests__/pages/NotFound.test.js
 */

/* Modulos externos */
import React from 'react';
import { mount } from 'enzyme';

/* Componentes */
import NotFound from '../../pages/notFound/NotFound';

it('Renders NotFound page without crashing', () => {
    const wrapper = mount(<NotFound/>);
    wrapper.unmount();
});