import '../../src/libs/decimal128.extension'
import { Decimal128 } from 'mongodb'
import { expect } from 'chai'

describe('Testing decimal128\'s extension library', () => {
	it('Should convert number to fullString representation', () => {
		expect(Decimal128.fromString('2').toFullString()).to.equals('2.0')
		expect(Decimal128.fromString('-2').toFullString()).to.equals('-2.0')
		expect(Decimal128.fromString('2e2').toFullString()).to.equals('200.0')
		expect(Decimal128.fromString('2e-2').toFullString()).to.equals('0.02')
		expect(Decimal128.fromString('8431674351687314e-5').toFullString()).to.equals('84316743516.87314')
		expect(Decimal128.fromString('8431674351687314E10').toFullString()).to.equals('84316743516873140000000000.0')
		expect(Decimal128.fromString('87315664.21657893218e4').toFullString()).to.equals('873156642165.7893218')
		expect(Decimal128.fromString('87315664.21657893218e-4').toFullString()).to.equals('8731.566421657893218')
		expect(Decimal128.fromString('2000000000000000000000000').toFullString()).to.equals('2000000000000000000000000.0')
	})

	it('Should return the absolut representation of a number', () => {
		expect(Decimal128.fromString('2').abs().toFullString()).to.equals('2.0')
		expect(Decimal128.fromString('2e2').abs().toFullString()).to.equals('200.0')
		expect(Decimal128.fromString('2e-2').abs().toFullString()).to.equals('0.02')
		expect(Decimal128.fromString('8431674351687314e-5').abs().toFullString()).to.equals('84316743516.87314')
		expect(Decimal128.fromString('84316743516873E10').abs().toFullString()).to.equals('843167435168730000000000.0')
		expect(Decimal128.fromString('87315664.21657893218e4').abs().toFullString()).to.equals('873156642165.7893218')
		expect(Decimal128.fromString('87315664.21657893218e-4').abs().toFullString()).to.equals('8731.566421657893218')
		expect(Decimal128.fromString('20000000000000000000').abs().toFullString()).to.equals('20000000000000000000.0')
		expect(Decimal128.fromString('-2').abs().toFullString()).to.equals('2.0')
		expect(Decimal128.fromString('-2e2').abs().toFullString()).to.equals('200.0')
		expect(Decimal128.fromString('-2e-2').abs().toFullString()).to.equals('0.02')
		expect(Decimal128.fromString('-8431674351687314e-5').abs().toFullString()).to.equals('84316743516.87314')
		expect(Decimal128.fromString('-84316743516873E10').abs().toFullString()).to.equals('843167435168730000000000.0')
		expect(Decimal128.fromString('-87315664.21657893218e4').abs().toFullString()).to.equals('873156642165.7893218')
		expect(Decimal128.fromString('-87315664.21657893218e-4').abs().toFullString()).to.equals('8731.566421657893218')
		expect(Decimal128.fromString('-20000000000000000000').abs().toFullString()).to.equals('20000000000000000000.0')
	})

	it('Should return Decimal128 from numeric representation', () => {
		expect(Decimal128.fromNumeric(2).toFullString()).to.equals('2.0')
		expect(Decimal128.fromNumeric(-2).toFullString()).to.equals('-2.0')
		expect(Decimal128.fromNumeric(2e2).toFullString()).to.equals('200.0')
		expect(Decimal128.fromNumeric(2e-2).toFullString()).to.equals('0.02')
		expect(Decimal128.fromNumeric(8431674351687314e-5).toFullString()).to.equals('84316743516.87314')
		expect(Decimal128.fromNumeric(-8431674351687314e-5).toFullString()).to.equals('-84316743516.87314')
		expect(Decimal128.fromNumeric(87315664.21657893e4).toFullString()).to.equals('873156642165.7893')
		expect(Decimal128.fromNumeric(87315664.21657893e-4).toFullString()).to.equals('8731.566421657893')
		expect(Decimal128.fromNumeric(8431674351687314E10).toFullString()).to.equals('84316743516873140000000000.0')
		expect(Decimal128.fromNumeric(2000000000000000000000000).toFullString()).to.equals('2000000000000000000000000.0')
	})

	it('Should cut decimals beyond specified', () => {
		expect(Decimal128.fromNumeric(2, 0).toFullString()).to.equals('2.0')
		expect(Decimal128.fromNumeric(-2, 0).toFullString()).to.equals('-2.0')
		expect(Decimal128.fromNumeric(2e-2, 1).toFullString()).to.equals('0.0')
		expect(Decimal128.fromNumeric(8431674351687314e-5, 3).toFullString()).to.equals('84316743516.873')
		expect(Decimal128.fromNumeric(-8431674351687314e-5, 1).toFullString()).to.equals('-84316743516.8')
		expect(Decimal128.fromNumeric(87315664.21657893e4, 6).toFullString()).to.equals('873156642165.7893')
		expect(Decimal128.fromNumeric(87315664.21657893e-4, 4).toFullString()).to.equals('8731.5664')
		expect(Decimal128.fromNumeric(87315664.21657893e-4, 0).toFullString()).to.equals('8731.566421657893')
		expect(Decimal128.fromNumeric(8431674351687314E10, 0).toFullString()).to.equals('84316743516873140000000000.0')
	})
	
	it('Should cut decimals from the end', () => {
		expect(Decimal128.fromNumeric(2.02e-2, -2).toFullString()).to.equals('0.02')
		expect(Decimal128.fromNumeric(2.123456789, -9).toFullString()).to.equals('2.0')
		expect(Decimal128.fromNumeric(8.431674351687314, -5).toFullString()).to.equals('8.4316743516')
		expect(Decimal128.fromNumeric(20000000000000000000000, -10).toFullString()).to.equals('20000000000000000000000.0')
	})

	it('Should fail to convert non-numeric strings', () => {
		expect(() => Decimal128.fromNumeric('2,5')).to.throw()
		expect(() => Decimal128.fromNumeric('235n')).to.throw()
		expect(() => Decimal128.fromNumeric('23.5.')).to.throw()
		expect(() => Decimal128.fromNumeric('235 78')).to.throw()
		expect(() => Decimal128.fromNumeric('abacaxi')).to.throw()
	})
})
