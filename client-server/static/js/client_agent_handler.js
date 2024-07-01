const CA_URL=""
window.addEventListener(
    "load",
    (event) => {

        
        /**modalDiv = document.createElement("div");
        modalDiv.id="modalDiv";
        modalDiv.className="modal-background";
        iframeDiv = document.createElement("div");
        iframeDiv.classList.add("ca-frame");
        iframeDiv.classList.add("ca-hidden");

        clientAgentFrame = document.createElement("iframe");
        clientAgentFrame.classList.add("ca-iframe");
        clientAgentFrame.scrolling = "no";
        iframeDiv.appendChild(clientAgentFrame)
        modalDiv.appendChild(iframeDiv);
        document.body.appendChild(modalDiv);*/
    },
    false
);
var iframeDiv;
var modalDiv;
var dataToProcess = null;
var clientAgentFrame;
//TODO add security check
window.addEventListener(
    "message",
    (event) => {
        
        processMessage(event.data);
    },
    false
);
function processMessage(data) {
    //const msg = JSON.parse(data);
    if (data["action"] == "GetData") {
        const send = {};
        send["action"] = "ReceiveData";
        send["data"] = dataToProcess;        
        send["process"] = data["process"];
        const sendMsg = JSON.stringify(send);
        clientAgentFrame.postMessage(sendMsg, "*");//contentWindow
    }else if(data["action"]=="Complete" && data["process"]=="Register"){
        closeClientAgent();
        refreshNotesList();
    }else if(data["action"]=="Complete" && data["process"]=="Save"){
        closeClientAgent();
        endSave = performance.now();
        calculateTimings();
        M.toast({ html: 'File Saved!', classes: 'rounded' });
    }else if(data["action"]=="Complete" && data["process"]=="Retrieve"){
        closeClientAgent();
        updateEditor(JSON.parse(data["data"]));
    }
}
function startClientAgent(action, data) {
    /**modalDiv.style.display = "block";
    iframeDiv.classList.add("ca-show");
    dataToProcess = data;
    clientAgentFrame.src = "/clientAgent?action=" + action;
    iframeDiv.classList.add("ca-show");
    iframeDiv.classList.remove("ca-hidden");**/
    dataToProcess = data;
    var left = (screen.width / 2) - (500 / 2);
    var top = (screen.height / 2) - (500 / 2);
    clientAgentFrame = window.open("/clientAgent?action=" + action,"CAWindow","width=500px,height=500px, top=" + top + ", left=" + left)
}
function closeClientAgent() {
    /**iframeDiv.classList.add("ca-hidden");
    iframeDiv.classList.remove("ca-show");
    modalDiv.style.display = "none";**/
    clientAgentFrame.close();
}