use dbExcahnge

db.createCollection("users", {
    validator: {
       $jsonSchema: {
          bsonType: "object",
          required: [ "email", "password", "major", "address" ],
          properties: {
             email: {
                bsonType: "string",
                description: "must be a string and is required"
             },
             password: {
                bsonType: "object",
                required: [ "hash", "salt"],
                properties: {
                   hash: {
                      bsonType: "string",
                      description: "must be a string if the field exists"
                   },
                   salt: {
                      bsonType: "string",
                      "description": "must be a string and is required"
                   }
                }
             }
          }
       }
    }
 })
 db.users.createIndex({ "email": 1 }, { unique: true })