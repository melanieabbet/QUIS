const express = require('express'); //A framework for web application
const httpServer = require('http').createServer();//A bassic http server to be used with socket.io
const io = require('socket.io')(httpServer);//the socket framework to enable RTC over http connection
const DEFAULT_PORT = 80
const io_func = require('./Scripts/socket.io.js');
const mysql_func = require('./Scripts/mysql.js');
var app = express();
var sockets = [];
var sockets_ = [];

app.use(express.static("public"));
app.get("/", (req, res) => {

  res.sendFile(path.join(public, 'index.html'));
});

io.on("connection", socket => {
  console.log("Socket connected.");
  io_func.setUpSocketConnections(socket);
  socket.isJointSet = false;
  socket.isMatchingOn = false;
  sockets.push(socket)
  socket.on('disconnect', function() {
      console.log('Got disconnect!');


      var i = sockets.indexOf(socket);
      sockets.splice(i, 1);

      var sql_updateMatching = "update matching m inner join user u on u.Id = m.user_ID set m.active = 0 where u.username = '"+socket.username+"' and m.active = 1";
      mysql_func.runSql(sql_updateMatching,function(){});


   });
  //step 0: Info user
  socket.on('verifyWord',function(data){

  });
  //Step 1: Insert into waiting queue
  socket.on('RequestRegister', (data) => {
    var sql_check_username = "select count(*) from user where username='"+data.username+"'";
    mysql_func.runSql(sql_check_username,function(result_user_check){
      var sql_insert ="";
      if(result_user_check[0]["count(*)"]>0){
        sql_insert="update user u left join langues l  on u.Id_languge = l.Id or u.Id_languge <> l.Id set u.Id_languge = l.Id where u.username = '"+data.username+"' and l.nom_langue = '"+data.langue_+"'"
      }else{
          sql_insert="insert into user(Nom,Prenom,Id_languge,username) select '','',Id,'"+data.username+"' from langues where nom_langue='"+data.langue_+"'"
      }
      console.log(sql_insert);
      mysql_func.runSql(sql_insert,function(result_insert){
        if(socket.username == null){
          socket.username = data.username;
          sockets_[socket.username] = socket;
          var sql_getMlangue = "SELECT l.nom_langue FROM user u inner join langues l on u.Id_languge=l.Id where u.username='"+data.username+"'";
          console.log(sql_getMlangue);
          mysql_func.runSql(sql_getMlangue,function(results_languge){
            socket.mlangue = results_languge[0].nom_langue;
            if(!socket.isMatchingOn){
              var sql_check = "select count(*) as result_count from matching m inner join user u on u.Id = m.user_ID where u.username = '"+data.username+"' and active = 1"
              mysql_func.runSql(sql_check,function(results){//check if user is already in a matching session
                if(results[0].result_count==0){
                  var sql_get_queue_info = "SELECT u.Id as 'UserId',u.Nom,u.Prenom,u.Id_languge,q.Id_Languge2,l1.nom_langue,q.Id as 'queue_ID' FROM queue q "+
                  "inner join langues l on q.Id_Languge1 = l.Id inner join user u on u.Id_languge = q.Id_Languge1 "+
                  "inner join langues l1 on l1.Id = q.Id_Languge2 "+
                  " where u.username='"+data.username+"' and l1.nom_langue='"+data.langue+"' ORDER BY q.Id_Languge2 ASC";
                  mysql_func.runSql(sql_get_queue_info,function(results){
                      var sql_insert_queue = "INSERT INTO matching(`queue_ID`, `user_ID`, `active`) VALUES ("+results[0].queue_ID+","+results[0].UserId+",1)";
                      mysql_func.runSql(sql_insert_queue,function(){
                        socket.emit("canMatch",{username:socket.username})
                      });
                  })
                }
              });
            }
          });
        }
        else{
          if(socket.username == data.username){//to make sure the procedure is called only one time.
            if(!socket.isMatchingOn){
            var sql_check = "select count(*) as result_count from matching m inner join user u on u.Id = m.user_ID where u.username = '"+data.username+"' and active = 1"
            mysql_func.runSql(sql_check,function(results){//check if user is already in a matching session
              if(results[0].result_count==0){
                var sql_get_queue_info = "SELECT u.Id as 'UserId',u.Nom,u.Prenom,u.Id_languge,q.Id_Languge2,l1.nom_langue,q.Id as 'queue_ID' FROM queue q "+
                "inner join langues l on q.Id_Languge1 = l.Id inner join user u on u.Id_languge = q.Id_Languge1 "+
                "inner join langues l1 on l1.Id = q.Id_Languge2 "+
                " where u.username='"+data.username+"' and l1.nom_langue='"+data.langue+"' ORDER BY q.Id_Languge2 ASC";
                mysql_func.runSql(sql_get_queue_info,function(results){
                    var sql_insert_queue = "INSERT INTO matching(`queue_ID`, `user_ID`, `active`) VALUES ("+results[0].queue_ID+","+results[0].UserId+",1)";
                    mysql_func.runSql(sql_insert_queue,function(){
                      socket.emit("canMatch",{username:socket.username})
                    });
                })
              }
            });
          }
          }
        }
      });


    });
  });
  //End Step 1
  //Step 2 RequestMatch
  socket.on('RequestWord', (data) => {
    var date_now = Date.now();
    if(socket.username == data.username){
      //var sql_queue = "select r.* from (select count(*) as Total,q.joint from (SELECT *,row_number() over (PARTITION by queue_ID order by input_date) 'rank' FROM `matching` WHERE active = 1) result inner join queue q on q.Id = result.queue_ID group by q.joint ORDER by q.joint) as r where r.Total >=2";
      var sql_queue = "select r.* from (select count(*) as Total,q.joint from (SELECT * FROM `matching` WHERE active = 1) result inner join queue q on q.Id = result.queue_ID group by q.joint ORDER by q.joint) as r where r.Total >=2";
      mysql_func.runSql(sql_queue,function(results){
        var detail = results[0];
        if(detail!=null){
          //var sql = "select r.*,u.username from (select result.*,q.joint from (SELECT *,row_number() over (PARTITION by queue_ID order by input_date) rank FROM matching WHERE active = 1) result inner join queue q on q.Id = result.queue_ID where q.joint='"+detail.joint+"' ORDER by q.joint ) as r inner join user u on u.Id = r.user_ID where r.rank=1 limit 2"
          var sql = "select r.*,u.username from (select result.*,q.joint from (select min(Id) as 'Id',queue_ID, min(user_ID) AS 'user_ID', min(input_date) as 'input_date' from matching WHERE active = 1 GROUP by queue_ID order by queue_ID, input_date) result inner join queue q on q.Id = result.queue_ID where q.joint='"+detail.joint+"' ORDER by q.joint ) as r inner join user u on u.Id = r.user_ID limit 2"
          mysql_func.runSql(sql,function(results_){
            results_.forEach(function(user, index, array) {
              sockets.forEach(function(socket_, index, array) {
                if(user.username == socket_.username){
                  console.log("hi")
                  if(!socket_.isJointSet){
                    socket_.isJointSet = true;
                    user.joint = date_now+"-"+user.joint;
                    socket_.emit("messageServeur", {joint_channel:user.joint})

                    var sql_updateMatching = "update matching m inner join user u on u.Id = m.user_ID set m.active = 0 where u.username = '"+socket_.username+"' and m.active = 1";
                    console.log(sql_updateMatching);
                    mysql_func.runSql(sql_updateMatching,function(){});
                    socket_.joint = user.joint;
                    socket_.on(user.joint, (data) => {
                      sockets.forEach(function(_socket, index, array) {
                        if(_socket.joint==user.joint && _socket.username != data.data.username){
                          console.log(data.data.username)
                          _socket.emit(user.joint, data);
                        }
                      })
                    })
                  }
                }else{
                  if(results_.some(user => user.username === socket_.username)){
                    socket_.emit("user_discovery", {otherusername:user.username})
                  }
                }
              });
            });
          });
      }
      });
   }
  });
  //End Step 2
  //Step 3: RequestWord
  socket.on("GenerateWord",(data) =>{
    var sql ="SELECT * FROM mots ORDER BY RAND ( ) limit 2"
    mysql_func.runSql(sql,function(result){
      var index_ = 0
      sockets.forEach(function(socket, index, array) {
        if(socket.joint==data.joint){
          socket.emit(data.joint,{data:{mlangue:socket.mlangue,word:result[index_],type:"word"}});
          index_++;
        }
      });
    });
  });
  //End Step 3
  //step 4:peer connection
  socket.on('make-offer', function (data) {
      socket.to(sockets_[data.to].id).emit('offer-made', {
        offer: data.offer,
        socket: socket.id
      });
  });
  //End Step 4
  //step 5:peer connection
  socket.on('make-answer', function (data) {
    var socket_id_target;
    sockets.forEach(function(socket_, index, array) {
      if(socket_.id == data.to){
        socket_id_target=socket_.username;
      }
    });
    socket.to(data.to).emit('answer-made', {
      socket: socket.username,
      answer: data.answer
    });
  });
});



app.listen(DEFAULT_PORT, () =>{
  console.log("listening on port "+ DEFAULT_PORT);
  /*mysql_func.runSql("SELECT * FROM langues",function(results){
      console.log(results);
  })*/
  }
);


httpServer.listen(3000);
