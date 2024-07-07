import { auth } from "./oauth-client";
import { providerAgent } from "./provider-agent";
import { SplashScreen } from '@capacitor/splash-screen';
export var currentElement=null;
document.addEventListener("deviceready", doLoad, false) ;

function doLoad(){
    loadInit();
    loadEvents();
}
window.currentElement = currentElement;
function loadEvents(){
    document.getElementById("verifyAuthorize").addEventListener("click", providerAgent.verifyAuthorize.bind(providerAgent));
    document.getElementById("verifyDeny").addEventListener("click", providerAgent.verifyDeny.bind(providerAgent));
    document.getElementById("otpBtn").addEventListener("click", providerAgent.calculateOTP.bind(providerAgent));
    //document.getElementById("authButton").addEventListener("onclick",signup.onOAuthBtnClick);
}
window.loadEvents = loadEvents;
window.document.onload = function(e){ 
    //loadEvents;
    //loadInit;
}

function loadInit(){
    SplashScreen.hide();
    if(currentElement!=null){
        currentElement.classList.add("slide-out");
        currentElement.classList.remove("slide-in");
    }
    currentElement = document.getElementById("init");
    showElement(document.getElementById("init"));
    initPushNotifications();
    window.auth.init();
    
}
function showLogin(){
    if(currentElement!=null){
        currentElement.classList.add("slide-out");
        currentElement.classList.remove("slide-in");
    }
    const login = document.getElementById("login");
    //document.getElementById("login").style.display = "None";
    showElement(login);
    currentElement = login;
    
    //document.getElementById("login").classList.remove("slide-in");
    //document.getElementById("login").style.display = "block";
    //document.getElementById("login").classList.add("slide-in");
}

function showElement(elem){
    if(elem.classList.contains("slide-in") && elem.classList.contains("slide-out")){
        elem.classList.remove("slide-out");
    }else if(elem.classList.contains("slide-out")){
        elem.classList.remove("slide-out");
        elem.classList.add("slide-in");  
    }else if(!elem.classList.contains("slide-in")){
        elem.classList.add("slide-in");  
    }
    
}
function slideOutCurrentElement(){
    if(currentElement!=null){
        currentElement.classList.add("slide-out");
        currentElement.classList.remove("slide-in");
    }
}
function showStatus(){
    slideOutCurrentElement();
    const status = document.getElementById("status");
    showElement(status);
    currentElement = status;
}
function showVerifyURL(){
    slideOutCurrentElement();
    const verifyUrl = document.getElementById("verifyUrlBlock");
    showElement(verifyUrl);
    currentElement = verifyUrl;
}
function showVerifyAuth(){
    slideOutCurrentElement();
    const verifyAuth = document.getElementById("OTPBlock");
    showElement(verifyAuth);
    currentElement = verifyAuth;
}

window.loadInit =loadInit;
window.showLogin = showLogin;
window.showStatus = showStatus;
window.showElement = showElement;
window.showVerifyURL = showVerifyURL;
window.showVerifyAuth = showVerifyAuth;