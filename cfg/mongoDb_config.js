//se nao existir db chamado db exchange, o mongo ira criar um quando algo for inserido
//esse codigo deve ser executado no mongo SHELL

use dbExcahnge

db.createUser({
	user: "exchange",
	pwd: "password",
	roles: [{ 
      role: "readWrite", 
      db: "dbExchange" 
   }],
	authenticationRestrictions: [{ clientSource: ["127.0.0.1"] }]
})