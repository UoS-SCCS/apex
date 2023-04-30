var openWindow=null;
function loadProviderAgent(){
    var left = (screen.width/2)-(500/2);
    var top = (screen.height/2)-(500/2);
    document.getElementById("openPAButton").classList.add("hidden-elem");
    document.getElementById("progressIndicator").classList.remove("hidden-elem");
    const passData = document.getElementById("jsonData").value;
    openWindow=window.open("http://127.0.0.3:5000/provider-agent?jsonData=" + encodeURI(passData),"ProviderAgentWindow","width=500px,height=500px, top="+top+", left="+left);
}
window.addEventListener('message', function(e) {
    var message = e.data;
    console.log(message);
    if(message=="complete"){
        openWindow.close();
        const current_URL = new URL(window.location.href);
        if (current_URL.searchParams.has("isAPEX")) {
            current_URL.searchParams.set("isAPEX","False");
        }
        window.location = current_URL;
    }
    
  });
/**window.onload= function() {

    var left = (screen.width/2)-(500/2);
    var top = (screen.height/2)-(500/2);

    const params = new URLSearchParams(window.location.search)
    params.set("openpopup","True");
    //window.location.search = params.toString();
    //window.location.href
    window.open(window.location.href + "?" + params.toString(),"ProviderAgentWindow","width=500px,height=500px, top="+top+", left="+left);
  };*/
  