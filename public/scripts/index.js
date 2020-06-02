const video = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const erreurHtml = document.getElementById("error");
const canvasVideoLocal = document.getElementById("local-canvas");
// Register Service Worker.
var joint_channel = "";
var connected_user = "";
var mediaRecorder;
var answersFrom = [];
var local_stream;
var last_secondVideo=0;
var last_Secondvideo_previous=0;
var video_played_once = false;
var ncopie = true;
var checkInterval
var dateStartPlay;
var dateEndPlay;
var word_recieved;
var validated_local = false;
var validated_remote = false;
var restart_local = false;
var restart_remote = false;
var peer;
var ishowing = false;


var answersFrom = {}, offer;


function error(err) {
    console.warn('Error', err);
}

var socket = io('http://quisetia.ch:3000');//changer ça ici en local
socket.on('connect', function(){
  console.log("connect")
  socket.emit('infoUser', {username:getCookie("username")});
  socket.on('disconnect', () => {
    console.log("disconnect");
});
});

socket.on('user_discovery',function(data){
  connected_user = data.otherusername
  $("#nom-div span").html(connected_user);
    peer = new Peer(getCookie("username"), {
     host: 'quisetia.ch',
     port: 9000,
     path: '/myapp'
    });
   peer.on('call', function(call) {
     var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
     getUserMedia({video: true, audio: true}, function(stream) {
       call.answer(stream); // Answer the call with an A/V stream.
       video.srcObject = stream;
       call.on('stream', function(remoteStream) {
         // Show stream in some video/canvas element.
         remoteVideo.srcObject = remoteStream;
       });
     }, function(err) {
       console.log('Failed to get local stream' ,err);
     });
   });
  console.log(data.otherusername)
})
socket.on('canMatch', (data) => {
  if(data.username == getCookie("username")){
    sendMessage();
  }
});
socket.on('messageServeur', (data) => {
  joint_channel = data.joint_channel;
  socket.on(joint_channel, (stream) => {//écouter sur la chaine joint
    if(stream.data.username != getCookie("username")){
      //do something here
      switch(stream.data.type){
        case "verification_message":
          var response = word_recieved.word.Mot_FR.toLowerCase()==stream.data.text.toLowerCase() || word_recieved.word.Mot_IT.toLowerCase()==stream.data.text.toLowerCase() || word_recieved.word.Mot_DE.toLowerCase()==stream.data.text.toLowerCase();
          socket.emit(joint_channel, {data:{ username:getCookie("username"), word:word_recieved.word,image:word_recieved.word.image,response:response, type:"verification_response" }});
          validated_remote = response;
          if(validated_remote){
            $("#found-div").show();
          }
        break;
        case "verification_response":
          if(stream.data.response){
            $("#masque-r").attr("src",stream.data.image);
            var word_text = "";
            switch (getCookie("selected_language")) {
              case "French":
                word_text = stream.data.word.Mot_FR;
                break;
              case "Italian":
                word_text = stream.data.word.Mot_IT;
                break;
              default:
                word_text = stream.data.word.Mot_DE;
                break
            }
            switch (getCookie("selected_language_W")) {
              case "French":
                word_text += ("<br/>"+stream.data.word.Mot_FR);
                break;
              case "Italian":
                word_text += ("<br/>"+stream.data.word.Mot_IT);
                break;
              default:
                word_text += ("<br/>"+stream.data.word.Mot_DE);
                break
            }
            $("#local-post").html(word_text);
            validated_local = true;
          }else{
            alert("Your answer is wrong! Ask perhaps your partner for the right spelling.");
          }
        break;
        case "restart_message":
          restart_remote = stream.data.restart_response;
          if(restart_local && restart_remote){
            getWord();
            restart_local  = false;
            restart_remote = false;
          }
        break;
        default:
          showGame();
          $("#found-div").hide();
          word_recieved = stream.data;
          $("#masque").attr("src",word_recieved.word.image);
          var word_text = "";
          console.log(stream.data)
          switch (stream.data.mlangue) {
            case "French":
              word_text = stream.data.word.Mot_FR;
              break;
            case "Italian":
              word_text = stream.data.word.Mot_IT;
              break;
            default:
              word_text = stream.data.word.Mot_DE;
              break
          }
          switch (getCookie("selected_language_W")) {
            case "French":
              word_text += ("<br/>"+stream.data.word.Mot_FR);
              break;
            case "Italian":
              word_text += ("<br/>"+stream.data.word.Mot_IT);
              break;
            default:
              word_text += ("<br/>"+stream.data.word.Mot_DE);
              break
          }
          $("#remote-word").html(word_text);
        break;
      }
      console.log(validated_remote && validated_local)
      if(validated_remote && validated_local){
        showdialogue();
        validated_remote = false;
        validated_local = false;
      }
  }
  });

  getWord();
});

function connect(){
  var username_input = getCookie("username");
  var language_input = getCookie("selected_language");
  var language_input_w = getCookie("selected_language_W");
  console.log("envoyé")
  socket.emit("RequestRegister", { username:username_input,langue:language_input_w,langue_:language_input });
}

function sendMessage(){
  var username_input = getCookie("username");
  socket.emit("RequestWord", { username:username_input });
}

function sendText(){
  console.log("clicked")
  var username_input = getCookie("username");
  var text_input = document.getElementById("message");
  socket.emit(joint_channel, {data:{ username:username_input, text:text_input.value, type:"verification_message" }});
}

function getWord(){
  hidedialogue();
  var username_input = getCookie("username");
  socket.emit("GenerateWord",{username:username_input,joint:joint_channel});
}

function sendVideo(){

  var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
  getUserMedia({video: true, audio: true}, function(stream) {
     var call = peer.call(connected_user, stream);
     video.srcObject = stream;
     call.on('stream', function(remoteStream) {
       // Show stream in some video/canvas element.
       remoteVideo.srcObject = remoteStream;
     });
   }, function(err) {
    erreurHtml.innerHTML = err
     console.log('Failed to get local stream' ,err);
   });
   /*
  if (navigator.mediaDevices.getUserMedia) {
      erreurHtml.innerHTML = "begin capture camera detected.";
      navigator.mediaDevices.getUserMedia({
      video:true,
      audio:false
    })
    .then(function (stream) {
      local_stream = stream;
      video.srcObject = stream;//source of video Object, which is the camera


      erreurHtml.innerHTML = "camera detected.";
    })
    .catch(function (err0r) {
      erreurHtml.innerHTML = err0r;
    });
  }else{
    erreurHtml.innerHTML = "Your browser doesn't have support for the navigator.getUserMedia interface.";
  }*/

}

$("#main-div").hide();
$("#current-location").hide();

document.getElementById("close").addEventListener("click", closeandplay);

 function closeandplay(){
   $("#warning").hide();
   $("#main-div").show();
   $("#current-location").show();

 }

function showdialogue(){
  $("#validate-div").hide();
  $("#replay-div-holder").show();
  $("#small_cow img").attr("src","/Mascot_H.png");
}

function hidedialogue(){
  $("#validate-div").show();
  $("#replay-div-holder").hide();
  $("#small_cow img").attr("src","/Mascot_R.png");
}

function restartGame(){
  restart_local = true;
  var username_input = getCookie("username");
  socket.emit(joint_channel, {data:{ username:username_input, restart_response:restart_local, type:"restart_message" }})
  if(restart_local&& restart_remote){
    getWord();
    restart_local  = false;
    restart_remote = false;
  }
}

function searchAnother(){
  location.reload(true);
}
function unselectAllLeft(){
  $("#list-languges-l").hide();
  $("#list-places-l").hide();
  $("#username-holder").hide();
  $("#username-ok-holder").hide();
  $("#list-levels").hide();
  $("#list-languges-l-w").hide();
}
function changeLangue(div){
  unselectAllLeft();
  $("#list-languges-l").toggle();
}
function changeLangueW(div){
  unselectAllLeft();
  $("#list-languges-l-w").toggle();
}
function selectLanguage(langue, isinrefresh=false){
  if(getCookie("selected_language_W")!=langue){
    setCookie("selected_language", langue, 30);
    checkIfAllFilled();
    if(!isinrefresh){
      $("#list-languges-l").toggle();
    }
    $("#button-langue").removeClass("non-current-badge");
    $("#button-langue").addClass("current-badge");
    $("#button-langue").html(langue);
    $("#alert_bad_language").hide();
  }else{
      $("#alert_bad_language").show();
  }
}
function selectLanguageW(langue, isinrefresh=false){
  if(getCookie("selected_language")!=langue){
    setCookie("selected_language_W", langue, 30);
    checkIfAllFilled();
    if(!isinrefresh){
      $("#list-languges-l-w").toggle();
    }
    $("#button-langue-w").removeClass("non-current-badge");
    $("#button-langue-w").addClass("current-badge");
    $("#button-langue-w").html(langue);
    $("#alert_bad_language").hide();
  }else{
      $("#alert_bad_language").show();
  }
}
function changeLevel(div){
  unselectAllLeft();
  $("#list-levels").toggle();
}
function selectLevel(level, isinrefresh=false){
  setCookie("selected_level", level, 30);
  checkIfAllFilled();
  if(!isinrefresh){
    $("#list-levels").toggle();
  }
  $("#button-level").removeClass("non-current-badge");
  $("#button-level").addClass("current-badge");
  $("#button-level").html(level);
}
function changePlace(div){
  unselectAllLeft();
  $("#list-places-l").toggle();
}
function selectPlace(place, isinrefresh=false){
  setCookie("selected_place", place, 30);
  checkIfAllFilled();
  if(!isinrefresh){
    $("#list-places-l").toggle();
  }
  $("#button-place").removeClass("non-current-badge");
  $("#button-place").addClass("current-badge");
  $("#button-place").html(place);
}

function changeName(div){
  unselectAllLeft();
  $("#username-holder").toggle();
  $("#username-ok-holder").toggle();
  $("#username").focus();
}
function selectName(user_=null, isinrefresh=false){
  var username;
  if(user_){
    username = user_;
  }else{
    username = $("#username").val()
  }
  if(!isinrefresh){
    $("#username-holder").toggle();
    $("#username-ok-holder").toggle();
  }
  $("#button-username").html(username);
  $("#button-username").removeClass("non-current-badge");
  $("#button-username").addClass("current-badge");
  setCookie("username", username, 30);
  checkIfAllFilled();
}
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function showQuis(){
  if(!ishowing){
    ishowing = true;
    $(".div-hidden").slideDown( "slow", function() {
      // Animation complete.
      $(".about").attr("onclick","hideQuis()")
      ishowing = false;
    });
    $(".about").html("&#8593");
  }
}
function hideQuis(){
  if(!ishowing){
    ishowing = true;
    $(".div-hidden").slideUp( "slow", function() {
      // Animation complete.
      $(".about").attr("onclick","showQuis()")
      ishowing = false;
    });
    $(".about").html("About");
  }
}
function checkIfAllFilledL(){
  var badge = "#badge-1";
  if(getCookie("selected_place") && getCookie("selected_language") && getCookie("username")) {
      $(badge).removeClass("non-current-badge");
      $(badge).addClass("current-badge");
      return true;
  }else{
      $(badge).removeClass("current-badge");
      $(badge).addClass("non-current-badge");
      return false;
  }
}
function checkIfAllFilledR(){
  var badge = "#badge-2";
  if(getCookie("selected_level") && getCookie("selected_language_W")){
    $(badge).removeClass("non-current-badge");
    $(badge).addClass("current-badge");
    return true;
  }else{
    $(badge).removeClass("current-badge");
    $(badge).addClass("non-current-badge");
    return false;
  }
}
function checkIfAllFilled(){
  if(checkIfAllFilledL() && checkIfAllFilledR()){
      $("#play-button").show();
  }else{
    $("#play-button").hide();
  }
}

function emptyCookies(){
  setCookie("selected_place","",30);
    setCookie("selected_level","",30);
      setCookie("selected_language","",30);
        setCookie("selected_language_W","",30);
          setCookie("username","",30);
}

function play(){
  $("#main-div").hide();
  $("#current-location").hide();
  $("#searching-div img").show();
  connect();
}

function showGame(){
  $("#searching-div").hide();
  $("#game-div").show();
  sendVideo();
}
$(document).ready(function(){
  if(getCookie("selected_place")){
    selectPlace(getCookie("selected_place"),true)
  }
  if(getCookie("selected_level")){
    selectLevel(getCookie("selected_level"),true)
  }
  if(getCookie("selected_language")){
    selectLanguage(getCookie("selected_language"),true)
  }
  if(getCookie("selected_language_W")){
    selectLanguageW(getCookie("selected_language_W"),true)
  }
  if(getCookie("username")){
    selectName(getCookie("username"),true)
  }
  checkIfAllFilledL();
  checkIfAllFilledR();
})
