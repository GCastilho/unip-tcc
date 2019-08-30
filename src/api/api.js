const mongoConnection = require('./mongoConnection')
const mongoFunctions = require('./mongoFunctions')

mongoConnection.startConnection(function (err){
    if (err) console.log(err, client )
    //provavelmente todas as partes do codigo que forem pensar em usar o mongo deverao ser usados aqui dentro
    //o que provavelmente siginifica o backend inteiro
    mongoFunctions.insertUser("email", "senha","salt")
})