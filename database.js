const mysql = require('mysql2');
const dbConnection = mysql.createPool({
    host     : 'localhost', // MYSQL HOST NAME
    user     : 'root', // MYSQL USERNAME
    password : '', // MYSQL PASSWORD
    database : 'vanitysystem' // MYSQL DB NAME
}).promise();
module.exports = dbConnection;


// var mysql      = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'root',
//   password : '',
//   database : 'test'
// });
// connection.connect(function(err){
// if(!err) {
//     console.log("Database is connected");
// } else {
//     console.log("Error while connecting with database");
// }
// });
// module.exports = connection;
