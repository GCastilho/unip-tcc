import React from 'react';
import {mount} from 'enzyme';

import Main from '../../pages/main/Main';

it('Renders Main page without crashing', () => {
    const wrapper = mount(<Main/>);
    wrapper.unmount();
});