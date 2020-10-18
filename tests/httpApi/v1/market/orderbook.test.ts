import { ImportMock } from 'ts-mock-imports'
import * as MarketApi from '../../../../src/marketApi'
import type { SinonStub } from 'sinon'

describe('Testing orderbook endpoint for HTTP API version 1', () => {
	let spy: SinonStub<Parameters<typeof MarketApi['add']>>

	beforeEach(() => {
		spy = ImportMock.mockFunction(MarketApi.add) as SinonStub<Parameters<typeof MarketApi['add']>>
	})

	afterEach(() => {
		spy.restore()
	})
})
