const mysql      = require('mysql');//import mysql library
const connection = mysql.createConnection({
  host     : '127.0.0.1',//change ici peut etre
  user     : 'Melanie',//
  password : 'qweewq',
  database : 'test1',
  port: "8889"
});
exports.runSql = function(sql,callback){//callback is your custom function that you define whenever you want to run a sql so that gives you more freedom on what you want to do with the results
  connection.query(sql, function (error, results, fields) {
    if (error) console.log(error);
    // Got results
    callback(results)
  });
}
