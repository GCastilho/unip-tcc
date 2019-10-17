const Client = require('bitcoin-core');

const wallet = new Client({
  network: 'regtest',
  username: 'exchange',
  password: 'password',
  port: 40000
});

(async function () {
  await wallet.generate(1);


  console.log(await wallet.getNewAddress());
  // => 0

}());

function createAccount() {
  return new Promise(function (resolve, reject) {
    client.call(account_create, function (err, res) {
      if (!err && !res.error) {
        resolve(res.account)
      } else {
        reject(err)
      }
    }
    )
  })
}
