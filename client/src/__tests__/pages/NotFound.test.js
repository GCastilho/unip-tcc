import React from 'react';
import {mount} from 'enzyme';

import NotFound from '../../pages/notFound/NotFound';

it('Renders NotFound page without crashing', () => {
    const wrapper = mount(<NotFound/>);
    wrapper.unmount();
});