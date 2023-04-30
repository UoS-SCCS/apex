window.addEventListener(
    "load",
    (event) => {
        iframeDiv = document.createElement("div");
        iframeDiv.classList.add("ca-frame");
        iframeDiv.classList.add("ca-hidden");

        clientAgentFrame = document.createElement("iframe");

        iframeDiv.appendChild(clientAgentFrame)
        document.body.appendChild(iframeDiv);
    },
    false
);
var iframeDiv;
var dataToProcess = null;
var clientAgentFrame;
//TODO add security check
window.addEventListener(
    "message",
    (event) => {
        console.log(event.data);
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
        clientAgentFrame.contentWindow.postMessage(sendMsg, "*");


    }
}
function startClientAgent(action, data) {
    dataToProcess = data;
    clientAgentFrame.src = "/clientAgent?action=" + action;
    iframeDiv.classList.add("ca-show");
    iframeDiv.classList.remove("ca-hidden");
}
function closeClientAgent() {
    iframeDiv.classList.add("ca-hidden");
    iframeDiv.classList.remove("ca-show");

}