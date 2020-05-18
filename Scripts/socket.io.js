const mysql_func = require('./mysql.js');


exports.setUpSocketConnections = function(socket){
  socket.on('RequestCorrection', () => {
    console.log("quelqu'un a demandé un mot");
  });
}
