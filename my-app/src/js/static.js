import { signup } from "./oauth-client";

function loadEvents(){
    console.log("Loading events");
    //console.log(signup);
    //document.getElementById("authButton").addEventListener("onclick",signup.onOAuthBtnClick);
}
window.loadEvents = loadEvents;
window.document.onload = function(e){ 
    //console.log(window.loadEvents);
    //loadEvents;
}


