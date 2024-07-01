var openWindow = null;
function loadProviderAgent() {
    var left = (screen.width / 2) - (500 / 2);
    var top = (screen.height / 2) - (500 / 2);
    document.getElementById("openPAButton").classList.add("hidden-elem");
    document.getElementById("progressIndicator").classList.remove("hidden-elem");
    const passData = document.getElementById("jsonData").value;
    openWindow = window.open("https://resource.apex.dev.castellate.com:5002/provider-agent?jsonData=" + encodeURI(passData), "ProviderAgentWindow", "width=500px,height=500px, top=" + top + ", left=" + left);
}
window.addEventListener('message', function (e) {
    var message = e.data;
    if (message == "complete") {
        openWindow.close();
        const current_URL = new URL(window.location.href);
        if (current_URL.searchParams.has("isAPEX")) {
            current_URL.searchParams.set("isAPEX", "False");
        }
        window.location = current_URL;
    }

});
function triggerAuthorise(){
    if (!!window.EventSource) {
        console.log("In trigger authorise");
        var source = new EventSource(document.location.href);
        source.onmessage = function(e) {
            const msg = JSON.parse(e.data);
            if(msg["success"]==true){
                source.close();
                const current_URL = new URL(window.location.href);
                if (current_URL.searchParams.has("isAPEX")) {
                    current_URL.searchParams.set("isAPEX", "False");
                }
                window.location = current_URL;
            }    
        }
      }
}

window.onload = function () {
    
    const passData = document.getElementById("jsonData").value;
    const jsonData = JSON.parse(passData);
    if(jsonData["method"] == "Direct"){
        document.getElementById("direct").classList.remove("hidden-elem");
    }else{
        document.getElementById("intermediary").classList.remove("hidden-elem");
        triggerAuthorise();
    }
};
/**window.onload= function() {

    var left = (screen.width/2)-(500/2);
    var top = (screen.height/2)-(500/2);

    const params = new URLSearchParams(window.location.search)
    params.set("openpopup","True");
    //window.location.search = params.toString();
    //window.location.href
    window.open(window.location.href + "?" + params.toString(),"ProviderAgentWindow","width=500px,height=500px, top="+top+", left="+left);
  };*/
