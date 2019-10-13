/*
 * Por razões de foi assim que deu pra fazer, o mock da currencyApi é feito
 * modificando o cache do require. Note que essa implementação faz com que
 * o mock só faça efeito após esse módulo ser invocado
 */

const currencyApi = require('../../src/currencyApi')

const accounts = {
	nano: {
		get: function() {
			if (this.current <= this.account.length) {
				const account = this.account[this.current]
				this.current ++
				return account
			} else {
				throw new RangeError('Naximum number of NANO accounts reached')
			}
		},
		current: 0,
		account: [
			'nano_1nxz3nh3w133be8zeqw1udj8co14bofxtd5z8twiotzyw9hprt4hsnjphofh',
			'nano_3hjfjxkf51efaebwpta1yuddcd8y47i1xm3fz6zxnrumn65rehj1buxr73e7',
			'nano_3fk9qwicz739dpgs8mjyh9b4wh8i5f1ghiojftxrs93jhtpq9tsf7cr9njje',
			'nano_3y93e9dpqkh39ze9j566xurhuuoqejajjsnc1g8x1mwo4fzq1snowkxgyfbb',
			'nano_13w4az4jucbn5ib1wearrtfp5s8g4so66ozhxa4tybfrfmwk4sz94xdbywr6',
			'nano_16gt7tz18m3dd85hdwdn55aden11d7exxegjmh35yi5xjke16c3s6po5uaz1',
			'nano_3fgfud1pjfiu197ft4h8ajoccuqb6niazwmhnsbcdo71iep7ic8wa4qgnnq5',
			'nano_3szfonk3dz47snwgkxz8sntrzbfpwgdshiic7riw53g7bpwhqpi9dj6dopdo',
			'nano_1baqrxboadgekwt3qm3b8ui9985tekrj8y5j7rdxgug5t7hmbwcu1mitjmb4',
			'nano_1tc7b5jnwsbxz6ybmu9ddb6dmydhasm6gnpwfpcjpz79ksanbwugpp4d7pup',
			'nano_1rzxeo1i8bzurkauniji3utj5bh5rejsoycobx5z4ngu1tqwunwypinh8h81'
		]
	}
}

const mock = {
	currencies: {
		nano: {
			create_account: function() {
				return Promise.resolve(accounts.nano.get())
			}
		}
	}
}

for (let currency in currencyApi.currencies) {
	currencyApi.currencies[currency] = { ...currencyApi.currencies[currency], ...mock.currencies[currency] }
}

module.exports = currencyApi
