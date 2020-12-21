import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

// Configura o plugin chai-as-promised no chai
chai.use(chaiAsPromised)

// Configura o 'should' para estar disponível nos testes
import 'chai/register-should'
