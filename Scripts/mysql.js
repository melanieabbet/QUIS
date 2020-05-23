const mysql      = require('mysql');//import mysql library
const connection = mysql.createConnection({
  host     : '127.0.0.1',//change ici peut etre
  user     : 'root',//
  password : 'Melanie_2',
  database : 'test1',
  port: "3306"
});
exports.runSql = function(sql,callback){//callback is your custom function that you define whenever you want to run a sql so that gives you more freedom on what you want to do with the results
  connection.query(sql, function (error, results, fields) {
    if (error) console.log(error);
    // Got results
    callback(results)
  });
}
