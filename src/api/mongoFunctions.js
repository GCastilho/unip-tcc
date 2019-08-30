const mongoConnection = require('./mongoConnection')
const assert =  require('assert')
// Use connect method to connect to the server
module.exports = {
    insertUser : function(email, passwordHash,salt)

    {   const collection = mongoConnection.db().collection('users')
        collection.insertOne({
            email : email,
            password : {
                hash : passwordHash,
                salt : salt
            },      
        }, function(err, result) {
            assert(err,null)
           //if (err.code = 11000){
          //      console.log("ertro ao cadastrar usuario:email ja existe no banco de dados")
         //   }
        console.log("user inserted in the database")
        })
    }
}