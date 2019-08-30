const client = require( 'mongodb' ).MongoClient;
const url = "mongodb://localhost:27017";

var db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( url,  { useNewUrlParser: true }, function( err, client ) {
      db  = client.db('test_db');
      return callback( err );
    } );
  },

  startConnection: function( callback ) {
    client.connect( url,  { useNewUrlParser: true }, 
        function( err, client ) {
        db  = client.db('dbExchange');
        return callback(err);
    } )
  },
  db: function() {
    return db;
  }
};