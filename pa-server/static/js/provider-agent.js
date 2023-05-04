window.onload = function () {
    initProviderAgent();
    keystore = new KeyStore();
    if (!keystore.isInitialised()) {
        generateKeys();
    }
    const current_URL = new URL(window.location.href);
    if (current_URL.searchParams.has("jsonData")) {
        const jsonData = JSON.parse(current_URL.searchParams.get("jsonData"));
        receivedData = jsonData;
        if (jsonData["action"] == "authorize") {
            authorize(jsonData);
        } else if (jsonData["action"] == "save") {
            save(jsonData);
        } else if (jsonData["action"] == "retrieve") {
            retrieve(jsonData);
        }
    }
    //window.opener.postMessage("Testing", "*");

}
var receivedData = {};
var currentURLHost = null;
function initProviderAgent() {

}


async function processRewrapPromise(serverPromiseData, promise_id) {

    //TODO Verify signatures
    const wrappedAgentKey = serverPromiseData["wrappedAgentKey"];
    const wrappedAgentKeyBytes = base64ToBytes(wrappedAgentKey);
    const wrappedResourceKey = serverPromiseData["wrappedResourceKey"];
    const wrappedResourceKeyBytes = base64ToBytes(wrappedResourceKey);

    const privateKey = await keystore.getEncPrivateKey("encryption");
    const decryptedAgentKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        wrappedAgentKeyBytes
    );
    const decryptedAgentAesKey = await window.crypto.subtle.importKey("raw", decryptedAgentKey, "AES-GCM", true, [
        "encrypt",
        "decrypt",
    ]);

    const decryptedResourceKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        wrappedResourceKeyBytes
    );
    /**const decryptedResourceAesKey = await window.crypto.subtle.importKey("raw", decryptedResourceKey, "AES-GCM", true, [
        "encrypt",
        "decrypt",
    ]);*/

    const reEncIV = window.crypto.getRandomValues(new Uint8Array(12));
    let reEncryptedResourceKey = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: reEncIV },
        decryptedAgentAesKey,
        decryptedResourceKey
    );
    const reEncryptedData = {};
    reEncryptedData["iv"] = bytesToBase64(reEncIV);
    reEncryptedData["cipher"] = _arrayBufferToBase64(reEncryptedResourceKey);

    const output = {};
    //output["reWrappedResourceKey"] = reEncryptedData
    output["promise_id"] = promise_id;
    //TODO this is result of signature check
    output["valid"] = true
    const returnData = {};
    returnData["promise"] = fetch("http://localhost:5000/promise-fulfilment", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(output)
    });
    returnData["reWrappedResourceKey"] = reEncryptedData
    return returnData;
}



function retrieve(data) {
    document.getElementById("retrieveBlock").classList.remove("hidden-elem");
    var reWrappedResourceKey = null;

    var promiseData = {}
    promiseData["promise_id"] = data["promise_id"]
    fetch("http://localhost:5000/promise?" + new URLSearchParams(promiseData), {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        }
    }).then((response) => response.json())
        .then(async (serverPromiseData) => {
            resp = await processRewrapPromise(serverPromiseData, data["promise_id"]);
            reWrappedResourceKey = resp["reWrappedResourceKey"];
            return resp["promise"];
        })
        .then((response) => response.json())
        .then((serverData) => {
            if (serverData["status"] == "fulfilled") {
                const promiseId = data["promise_id"];
                const redirectArgs = {};
                redirectArgs["promiseId"] = promiseId;
                redirectArgs["status"] = "fulfilled";
                redirectArgs["action"] = "promise";
                redirectArgs["agentChanges"] = false;
                redirectArgs["type"] = serverData["type"];
                redirectArgs["rewrappedResourceKey"] = JSON.stringify(reWrappedResourceKey);

                const params = new URLSearchParams(redirectArgs);
                var redirectUrl = data["redirect"] + "?" + params.toString();
                window.location = redirectUrl;
            }
        })
        .catch(err => {
            console.log(err);
        });

}

function save(data) {
    document.getElementById("saveBlock").classList.remove("hidden-elem");

    var promiseData = {}
    promiseData["promise_id"] = data["promise_id"]
    fetch("http://localhost:5000/promise?" + new URLSearchParams(promiseData), {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        }
    }).then((response) => response.json())
        .then(async (serverPromiseData) => {
            //TODO Verify signatures
            const wrappedKey = serverPromiseData["promise_data"]["wrappedKey"];
            const wrappedKeyBytes = base64ToBytes(wrappedKey);
            const privateKey = await keystore.getEncPrivateKey("encryption");
            const decryptedKey = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                wrappedKeyBytes
            );
            const iv = base64ToBytes(serverPromiseData["promise_data"]["encryptedData"]["iv"]);
            const cipher = base64ToBytes(serverPromiseData["promise_data"]["encryptedData"]["cipher"]);
            const aesKey = await window.crypto.subtle.importKey("raw", decryptedKey, "AES-GCM", true, [
                "encrypt",
                "decrypt",
            ]);
            let decryptedMessage = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                cipher
            );
            const decryptedData = new TextDecoder().decode(decryptedMessage);


            let reEncKey = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256,
                },
                true,
                ["encrypt", "decrypt"]
            );
            const reEncIV = window.crypto.getRandomValues(new Uint8Array(12));
            let reEncryptedMessage = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: reEncIV },
                reEncKey,
                decryptedMessage
            );
            const reEncryptedData = {};
            reEncryptedData["iv"] = bytesToBase64(reEncIV);
            reEncryptedData["cipher"] = _arrayBufferToBase64(reEncryptedMessage);

            const output = {};
            output["reEncryptedData"] = reEncryptedData
            const ownerPublicKey = await keystore.getEncPublicKey("encryption");
            let wrappedReEncKey = await window.crypto.subtle.wrapKey("raw", reEncKey, ownerPublicKey, {
                name: "RSA-OAEP",
            });
            output["wrappedReEncKey"] = _arrayBufferToBase64(wrappedReEncKey);
            output["promise_id"] = data["promise_id"];

            //TODO this is result of signature check
            output["valid"] = true
            return fetch("http://localhost:5000/promise-fulfilment", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "include", // include, *same-origin, omit
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(output)
            })
        })
        .then((response) => response.json())
        .then((serverData) => {
            if (serverData["status"] == "fulfilled") {
                const promiseId = data["promise_id"];
                const redirectArgs = {};
                redirectArgs["status"] = "fulfilled";
                redirectArgs["action"] = "promise";
                redirectArgs["agentChanges"] = false;
                redirectArgs["type"] = serverData["type"];
                const params = new URLSearchParams(redirectArgs);
                var redirectUrl = data["redirect"] + "?" + params.toString();
                window.location = redirectUrl;
            }
        })
        .catch(err => {
            console.log(err);
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
function authorize(data) {
    const url = new URL(data["pk_endpoint"]);
    currentURLHost = url.hostname;
    document.getElementById("verifyUrl").innerText = url.hostname;
    document.getElementById("verifyUrlBlock").classList.remove("hidden-elem");
}
function verifyAuthorize() {
    document.getElementById("verifyUrlBlock").classList.add("hidden-elem");
    document.getElementById("OTPBlock").classList.remove("hidden-elem");
}
function calculateOTP() {

    constructKeySignature(document.getElementById("OTP").value);
}

const ECDSA = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: {
        name: "SHA-256"
    },
}
var keystore;

async function generateKeys() {
    var enc = new TextEncoder("utf-8");
    //P-256
    await window.crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"])
        .then(function (key) {
            const publicKey = key.publicKey;
            const privateKey = key.privateKey;
            keystore.setPublicKey("signing", publicKey);
            keystore.setPrivateKey("signing", privateKey);
        })
        .catch(function (error) {
            console.log("Error generating key pair:" + error);
        });

    await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    ).then(async function (key) {
        const publicKey = key.publicKey;
        const privateKey = key.privateKey;
        await keystore.setPublicKey("encryption", publicKey);
        await keystore.setPrivateKey("encryption", privateKey);
        const encodedEncPublicKey = JSON.parse(keystore.getEncodedPublicKey("encryption"));
        const output = {};
        output["e"] = encodedEncPublicKey["e"];
        output["kty"] = encodedEncPublicKey["kty"];
        output["n"] = encodedEncPublicKey["n"];
        const jsonPubKeyStr = JSON.stringify(output, Object.keys(output).sort());
        console.log("here:" +jsonPubKeyStr);
        const signingKey = await keystore.getPrivateKey("signing");
        return window.crypto.subtle.sign(
            ECDSA,
            signingKey,
            enc.encode(jsonPubKeyStr)
        )
    }).then(signature => {
        const stringSignature = _arrayBufferToBase64(signature);
        keystore.setClientPublicKeySignature(stringSignature);
    }).catch(function (error) {
        console.log("Error generating encryption key pair:" + error);
    });




}





function constructKeySignature(otp) {
    const encodedKey = JSON.parse(keystore.getEncodedPublicKey("signing"));
    const output = {};
    output["crv"] = encodedKey.crv;
    output["kty"] = encodedKey.kty;
    output["x"] = encodedKey.x;
    output["y"] = encodedKey.y;
    const jsonStr = JSON.stringify(output, Object.keys(output).sort());
    generateHMAC(otp, jsonStr, sendKeyHMAC);
}
function sendKeyHMAC(hmac) {
    const data = {};
    data["ownerEncPublicKey"] = keystore.getEncodedPublicKey("encryption");
    data["ownerEncPublicKeySignature"] = keystore.getClientPublicKeySignature();
    data["publicKey"] = keystore.getEncodedPublicKey("signing");
    data["hmac"] = hmac;
    fetch(receivedData["pk_endpoint"], {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    }).then((response) => response.json())
        .then(data => {
            receivedKey = data["publicKey"];
            const hmac = data["hmac"];
            const output = {};
            output["crv"] = receivedKey.crv;
            output["kty"] = receivedKey.kty;
            output["x"] = receivedKey.x;
            output["y"] = receivedKey.y;
            const jsonStr = JSON.stringify(output, Object.keys(output).sort());

            verifyHMAC(document.getElementById("OTP").value, hmac, jsonStr, verifyClientHmac);
        }).catch(err => {
            console.log(err);
        });

}
var receivedKey;
async function verifyClientHmac(result) {
    if (!result) {
        alert("HMAC check failed, cannot continue");
        return;
    }
    var enc = new TextEncoder("utf-8");
    const output = {};
    output["crv"] = receivedKey.crv;
    output["kty"] = receivedKey.kty;
    output["x"] = receivedKey.x;
    output["y"] = receivedKey.y;
    const jsonStr = JSON.stringify(output, Object.keys(output).sort());
    const privateKey = await keystore.getPrivateKey("signing");
    window.crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-512" },
        },
        privateKey,
        enc.encode(jsonStr)
    ).then(signature => {
        keystore.setClientPublicKey(currentURLHost, receivedKey);
        sendSignatureToServer(currentURLHost, signature);
    });
}
const PROVIDER_CERT_ENDPOINT = "http://127.0.0.1:5000/client_cert_endpoint";
function sendSignatureToServer(currentHost, signature) {
    var data = {};
    data["hostname"] = currentHost;
    data["signature"] = signature;
    data["clientPublicKey"] = receivedKey
    fetch(PROVIDER_CERT_ENDPOINT, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "include", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    }).then((response) => response.json())
        .then(data => {
            if (data["success"]) {
                window.opener.postMessage("complete", "*");
            }
        }).catch(err => {
            console.log(err);
        });
}
function generateHMAC(key, data, callback) {
    // encoder to convert string to Uint8Array
    var enc = new TextEncoder("utf-8");

    window.crypto.subtle.importKey(
        "raw", // raw format of the key - should be Uint8Array
        enc.encode(key),
        { // algorithm details
            name: "HMAC",
            hash: { name: "SHA-512" }
        },
        false, // export = false
        ["sign", "verify"] // what this key can do
    ).then(key => {
        window.crypto.subtle.sign(
            "HMAC",
            key,
            enc.encode(data)
        ).then(signature => {
            var b = new Uint8Array(signature);
            var str = Array.prototype.map.call(b, x => x.toString(16).padStart(2, '0')).join("")
            callback(str);
        });
    });
}
function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

function verifyHMAC(key, signature, data, callback) {
    // encoder to convert string to Uint8Array
    var enc = new TextEncoder("utf-8");
    const sigBytes = new Uint8Array(signature.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
      }))
    window.crypto.subtle.importKey(
        "raw", // raw format of the key - should be Uint8Array
        enc.encode(key),
        { // algorithm details
            name: "HMAC",
            hash: { name: "SHA-512" }
        },
        false, // export = false
        ["sign", "verify"] // what this key can do
    ).then(key => {
        window.crypto.subtle.verify(
            "HMAC",
            key,
            sigBytes,
            enc.encode(data)
        ).then(result => {
            callback(result);

        });
    });
}
