
window.addEventListener(
    "message",
    (event) => {
        
        console.log("received message");
        processMessage(event.data);
    },
    false
);
window.addEventListener(
    "load",
    (event) => {
        
        keystore = new KeyStore();
        if (!keystore.isInitialised()) {
            generateKeys();
        }
        let params = (new URL(document.location)).searchParams;
        let action = params.get("action");
        if (action == "register") {
            startRegister();
        }

    },
    false
);
var keystore;
function generateKeys() {
    window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    ).then(function (key) {
        const publicKey = key.publicKey;
        const privateKey = key.privateKey;
        keystore.setEncPublicKey("encryption", publicKey);
        keystore.setEncPrivateKey("encryption", privateKey);
    }).catch(function (error) {
        console.log("Error generating encryption key pair:" + error);
    });


}
function startRegister() {
    const msg = {};
    msg["action"] = "GetData";
    msg["process"] = "Register";
    postToParent(msg);
}
async function processRegister(data) {
    let key = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
    const enc = new TextEncoder();
    const message = JSON.stringify(data);
    const encodedMessage = enc.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    let encryptedMessage = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedMessage
    );
    const output = {};
    output["iv"] = bytesToBase64(iv);
    output["cipher"] = _arrayBufferToBase64(encryptedMessage);
    const privateKey = await keystore.getEncPublicKey("encryption");
    let wrappedKey = await window.crypto.subtle.wrapKey("raw", key, privateKey, {
        name: "RSA-OAEP",
      })
    console.log(wrappedKey);
    console.log(encryptedMessage);
    output["wrappedKey"] = _arrayBufferToBase64(wrappedKey);
    console.log(output);
}
function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}
function processMessage(data) {
    console.log("processing message:" + data);
    const msg = JSON.parse(data);
    if (msg["action"] == "ReceiveData") {
        if (msg["process"] == "Register") {
            processRegister(msg["data"]);
        }
    }
}
function postToParent(data) {
    const msg = JSON.stringify(data);
    window.parent.postMessage(data, "http://127.0.0.2:5000");
}
