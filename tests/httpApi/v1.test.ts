import '../../src/libs'

describe('Testing version 1 of HTTP API', () => {
	it('Should return information about the API')

	it('Should return Bad Request if the request is unrecognized')

	it('Should return Not Found if the path for the request was not found')

	describe('/currencies', () => {
		it('Should return information about the suported currencies')
	})

	describe('/transaction', () => {
		it('Should return information about the subpath')

		describe('/:opid', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return Not Authorized if transaction is from a different user')

			it('Should return informations about the transaction')
		})
	})

	describe('/user', () => {
		it('Should return information about the subpath')

		describe('/info', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return user information')
		})

		describe('/balances', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('should return a balances object from the user')
		})

		describe('/accounts', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('should return a accounts object from the user')
		})

		describe('/withdraw', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return Bad Request if the request is malformed')

			it('Should execute a withdraw for a given currency from the user')
		})
	})
})
