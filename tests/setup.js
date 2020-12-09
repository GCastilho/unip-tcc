/* eslint-disable @typescript-eslint/no-var-requires */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Configura o plugin chai-as-promised no chai
chai.use(chaiAsPromised)

// Configura o 'should' para estar disponível nos testes
require('chai/register-should')
