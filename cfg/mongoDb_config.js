/**
 * cfg/mongodb_config.js
 * 
 * @description esse arquivo contém a estrutura do mongoDB, com usuários e collections
 * 
 * Para executá-lo digite '<mongo> path/to/this/file.js', sendo <mongo> o
 * binário do shell do servidor (não é 'mongod' ou 'mongos', o utilitário chama-se 'mongo')
 * 
 * ou cole o conteúdo desse arquivo no shell de sessão do db com privilégios de administrador
 * 
 * @see https://docs.mongodb.com/manual/tutorial/write-scripts-for-the-mongo-shell/
 */

db = db.getSiblingDB('exchange')

db.createUser({
	user: "exchange",
	pwd: "password",
	roles: [{ 
		role: "readWrite",
		db: "exchange"
	}],
	authenticationRestrictions: [{ clientSource: ["127.0.0.1"] }]
})
