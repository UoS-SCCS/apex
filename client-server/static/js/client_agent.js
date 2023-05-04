
window.addEventListener(
    "message",
    (event) => {
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
        } else if (action == "promise") {

            processPromise(params);
        } else if (action == "retrieve") {
            startRetrieve();
        }

    },
    false
);

async function processPromise(params) {

    if (params.get("type") == "register") {
        const msg = {};
        msg["action"] = "Complete";
        msg["process"] = "Register";

        postToParent(msg);
    } else if (params.get("type") == "save") {
        const msg = {};
        msg["action"] = "Complete";
        msg["process"] = "Save";
        postToParent(msg);
    } else if (params.get("type") == "rewrap") {

        const promiseId = params.get("promiseId");

        const rewrappedResourceKey = JSON.parse(params.get("rewrappedResourceKey"));
        const agentKey = await getPromiseKeyMapping(promiseId);
        const iv = base64ToBytes(rewrappedResourceKey["iv"]);
        const cipher = base64ToBytes(rewrappedResourceKey["cipher"]);
        let decryptedResourceKey = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            agentKey,
            cipher
        );
        const data = await decryptFile(promiseId, decryptedResourceKey);
        removePromiseMappings(promiseId);
        const msg = {};
        msg["action"] = "Complete";
        msg["process"] = "Retrieve";
        msg["data"] = data;
        postToParent(msg);

    }
}
async function decryptFile(promiseId, decryptedResourceKey) {
    const sessionId = getSessionPromiseMapping(promiseId);
    var fileData = null;
    if (sessionId != null) {
        fileData = await getSessionFile(sessionId);
    }
    if (fileData != null) {

        const data = JSON.parse(fileData);

        const iv = base64ToBytes(data["encryptedData"]["iv"]);
        const cipher = base64ToBytes(data["encryptedData"]["cipher"]);
        const aesKey = await window.crypto.subtle.importKey("raw", decryptedResourceKey, "AES-GCM", true, [
            "encrypt",
            "decrypt",
        ]);
        let decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            cipher
        );
        return (new TextDecoder()).decode(decryptedData);
    }
    return null;
}
var keystore;
function generateKeys() {
    /**window.crypto.subtle.generateKey(
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
    });*/


}

function startRegister() {
    const msg = {};
    msg["action"] = "GetData";
    msg["process"] = "Register";
    postToParent(msg);
}
function startRetrieve() {
    const msg = {};
    msg["action"] = "GetData";
    msg["process"] = "Retrieve";
    postToParent(msg);
}
function removePromiseMappings(promiseId) {
    var mapping = window.localStorage.getItem("mapping");
    if (mapping != null) {
        mapping = JSON.parse(mapping);
        delete mapping[promiseId];
        window.localStorage.setItem("mapping", JSON.stringify(mapping));
    }
    var mapping = window.localStorage.getItem("key_mapping");
    if (mapping != null) {
        mapping = JSON.parse(mapping);
        delete mapping[promiseId];
        window.localStorage.setItem("key_mapping", JSON.stringify(mapping));
    }

}
function getSessionPromiseMapping(promiseId) {
    //TODO Not currently thread safe
    var mapping = window.localStorage.getItem("mapping");
    if (mapping == null) {
        mapping = {};
    } else {
        mapping = JSON.parse(mapping);
    }
    return mapping[promiseId];
}
async function getPromiseKeyMapping(promiseId) {
    var mapping = window.localStorage.getItem("key_mapping");
    if (mapping == null) {
        mapping = {};
    } else {
        mapping = JSON.parse(mapping);
    }
    const rawKey = base64ToBytes(mapping[promiseId]);
    return await window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", true, [
        "encrypt",
        "decrypt",
    ]);
}
function createPromiseKeyMapping(promiseId, key) {
    //TODO Not currently thread safe
    var mapping = window.localStorage.getItem("key_mapping");
    if (mapping == null) {
        mapping = {};
    } else {
        mapping = JSON.parse(mapping);
    }
    mapping[promiseId] = _arrayBufferToBase64(key);
    window.localStorage.setItem("key_mapping", JSON.stringify(mapping));
}
function createSessionPromiseMapping(sessionId, promiseId) {
    //TODO Not currently thread safe
    var mapping = window.localStorage.getItem("mapping");
    if (mapping == null) {
        mapping = {};
    } else {
        mapping = JSON.parse(mapping);
    }
    mapping[promiseId] = sessionId;
    window.localStorage.setItem("mapping", JSON.stringify(mapping));
}
async function getSessionFile(sessionId) {
    const dirHandle = await navigator.storage.getDirectory();
    const fileHandle = await dirHandle.getFileHandle(sessionId);
    const file = await fileHandle.getFile();
    return await file.text()

}
async function getOwnerPublicKey() {
    if (window.localStorage.getItem("ownerPublicKey") == null) {
        const fetchResponse = await fetch("/notes/get_owner_public_key", {
            cache: "no-cache",
            credentials: "include"
        });
        const jsonOwnerPublicKey = await fetchResponse.json();
        window.localStorage.setItem("ownerPublicKey",JSON.stringify(jsonOwnerPublicKey));
        
        const publicEncKey = await window.crypto.subtle.importKey("jwk", jsonOwnerPublicKey,
            RSA,
            true,
            ["encrypt", "wrapKey"]
        );
        return publicEncKey;
    } else {
        const jsonOwnerPublicKey = JSON.parse(window.localStorage.getItem("ownerPublicKey"));
        const publicEncKey = await window.crypto.subtle.importKey("jwk", jsonOwnerPublicKey,
            RSA,
            true,
            ["encrypt", "wrapKey"]
        );
        return publicEncKey;
    }
}
async function processRetrieve(data) {

    let key = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
    const sessionId = crypto.randomUUID();
    const dirHandle = await navigator.storage.getDirectory();
    const fileHandle = await dirHandle.getFileHandle(sessionId, { create: true });

    const accessHandle = await fileHandle.createWritable();
    accessHandle.write(JSON.stringify(data));
    accessHandle.close();
    

    const publicEncKey = await getOwnerPublicKey();

    //const privateKey = await keystore.getEncPublicKey("encryption");
    let wrappedKey = await window.crypto.subtle.wrapKey("raw", key, publicEncKey, {
        name: "RSA-OAEP",
    });
    const response = {};
    //response["sessionId"] = sessionId;

    response["wrappedAgentKey"] = _arrayBufferToBase64(wrappedKey);
    response["wrappedKey"] = data["wrappedKey"];
    response["name"] = data["name"];
    fetch("/notes/wrap_key_apex", {
        method: "POST",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(response),
    })
        .then((response) => response.json())
        .then(async (data) => {

            var promiseData = {};
            createSessionPromiseMapping(sessionId, data["promise_id"]);
            const agentKey = await window.crypto.subtle.exportKey("raw", key);
            createPromiseKeyMapping(data["promise_id"], agentKey);
            promiseData["promise_id"] = data["promise_id"];
            promiseData["action"] = "retrieve";
            promiseData["redirect"] = "http://127.0.0.2:5000/clientAgent";
            var url_data = {}

            url_data["jsonData"] = JSON.stringify(promiseData);

            window.location = "http://127.0.0.3:5000/provider-agent?" + new URLSearchParams(url_data);
        });
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
    const message = JSON.stringify(data["data"]);
    const encodedMessage = enc.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    let encryptedMessage = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedMessage
    );
    const encryptedData = {};
    encryptedData["iv"] = bytesToBase64(iv);
    encryptedData["cipher"] = _arrayBufferToBase64(encryptedMessage);
    const output = {};
    output["encryptedData"] = encryptedData
    const publicEncKey = await getOwnerPublicKey();
    //const privateKey = await keystore.getEncPublicKey("encryption");
    let wrappedKey = await window.crypto.subtle.wrapKey("raw", key, publicEncKey, {
        name: "RSA-OAEP",
    })
    output["wrappedKey"] = _arrayBufferToBase64(wrappedKey);
    output["name"] = data["name"]
    submitMethod = "PUT";
    if ("isNew" in data && data["isNew"]) {
        submitMethod = "POST";
    }
    fetch("/notes/save_apex", {
        method: submitMethod,
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(output),
    })
        .then((response) => response.json())
        .then((data) => {
            var promiseData = {};
            promiseData["promise_id"] = data["promise_id"];
            promiseData["action"] = "save";
            promiseData["redirect"] = "http://127.0.0.2:5000/clientAgent";
            var url_data = {}

            url_data["jsonData"] = JSON.stringify(promiseData);
            window.location = "http://127.0.0.3:5000/provider-agent?" + new URLSearchParams(url_data);
        });
}


function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
function processMessage(data) {
    const msg = JSON.parse(data);
    if (msg["action"] == "ReceiveData") {
        if (msg["process"] == "Register") {
            processRegister(msg["data"]);
        } else if (msg["process"] == "Retrieve") {
            processRetrieve(msg["data"]);
        }
    }
}
function postToParent(data) {
    const msg = JSON.stringify(data);
    window.parent.postMessage(data, "http://127.0.0.2:5000");
}
