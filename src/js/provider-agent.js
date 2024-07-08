

import { keyStore } from "./keystore";
import { auth } from "./oauth-client";
const PROV_URL = "https://resource.apex.dev.castellate.com:5001/"
const API_URL = "https://resource.apex.dev.castellate.com:5001/api/v1/users/";
window.onload = function () {
    //initProviderAgent();


}
const ECDSA = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: {
        name: "SHA-256"
    },
}
const PROVIDER_CERT_ENDPOINT = PROV_URL + "client_cert_endpoint";
const CRS = "APEXNotesLink";
function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
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

function b642ab(base64_string){
    return Uint8Array.from(window.atob(base64_string), c => c.charCodeAt(0));
}
var startTime =0;
var endTime=0;
export class ProviderAgent {


    keystore;
    receivedKey;
    receivedData = {};
    currentURLHost = null;
    keystore = keyStore;
    uid = null;
    
    constructor() {



    }
    reset() {
        this.keystore.clear();
    }
    initProviderAgent() {
        this.keystore.initKeystore().then(function () {
            if (!keyStore.isInitialised()) {
                this.generateKeys();
            }
        }.bind(this));
    }

    processMessage(jsonData) {
        this.receivedData = jsonData;
        if (jsonData["action"] == "authorize") {
            this.authorize(jsonData);
        } else if (jsonData["action"] == "save") {
            this.save(jsonData);
        } else if (jsonData["action"] == "retrieve") {
            this.retrieve(jsonData);
        }
    }
    async processRewrapPromise(serverPromiseData, promise_id) {




        var enc = new TextEncoder("utf-8");

        const wrappedAgentKey = serverPromiseData["wrappedAgentKey"];
        const wrappedAgentKeyBytes = base64ToBytes(wrappedAgentKey);
        const wrappedResourceKey = serverPromiseData["wrappedResourceKey"];
        const wrappedResourceKeyBytes = base64ToBytes(wrappedResourceKey);


        const clientSig = serverPromiseData["clientSignature"];
        var sigData = wrappedResourceKey + wrappedAgentKey;
        const combined = b642ab(clientSig);
                
        var clientPublicKey = keyStore.getClientPublicKey(serverPromiseData["host"]);
        const encodedClientPublicKey = clientPublicKey;
        const publicClientKey = await window.crypto.subtle.importKey("jwk", encodedClientPublicKey, ECDSA, true, ["verify"]);
        let verified = await window.crypto.subtle.verify(ECDSA, publicClientKey, Int8Array.from(combined), enc.encode(sigData));
        if (!verified) {
            console.log("signature verification failed");
            return;
        }

        const privateKey = await keyStore.getEncPrivateKey("encryption");
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

        output["valid"] = true
        const returnData = {};
        returnData["reWrappedResourceKey"] = reEncryptedData;
        output["reWrappedResourceKey"] = reEncryptedData;
        var myHeaders = auth._getHeaders();
        myHeaders["method"] = "POST";
        myHeaders["headers"]["Content-Type"] = "application/json";
        myHeaders["body"] = JSON.stringify(output);
        returnData["promise"]= await fetch(PROV_URL + "promise-fulfilment", myHeaders);

        /**returnData["promise"] = await fetch(PROV_URL + "promise-fulfilment", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "include", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(output)
        });*/

        return returnData;
    }



    retrieve(data) {
        startTime = performance.now();
        document.getElementById("retrieveBlock").classList.remove("hidden-elem");
        var reWrappedResourceKey = null;

        var promiseData = {}
        promiseData["promise_id"] = data["promise_id"]
        fetch(PROV_URL + "promise?" + new URLSearchParams(promiseData), {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            credentials: "include", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
            }
        }).then((response) => response.json())
            .then(async function (serverPromiseData) {
                const resp = await this.processRewrapPromise(serverPromiseData, data["promise_id"]);
                reWrappedResourceKey = resp["reWrappedResourceKey"];
                return resp["promise"];
            }.bind(this))
            .then((response) => response.json())
            .then((serverData) => {
                endTime = performance.now();
                console.log("Time:" + String((endTime - startTime)));
                if (serverData["status"] == "fulfilled") {
                    //Show some UI
                    /**const promiseId = data["promise_id"];
                    const redirectArgs = {};
                    redirectArgs["promiseId"] = promiseId;
                    redirectArgs["status"] = "fulfilled";
                    redirectArgs["action"] = "promise";
                    redirectArgs["agentChanges"] = false;
                    redirectArgs["type"] = serverData["type"];
                    redirectArgs["rewrappedResourceKey"] = JSON.stringify(reWrappedResourceKey);
                    const params = new URLSearchParams(redirectArgs);
                    var redirectUrl = data["redirect"] + "?" + params.toString();
                    window.location = redirectUrl;*/
                }
            })
            .catch(err => {
                console.log(err);
            });

    }

    save(data) {
        startTime = performance.now();
        document.getElementById("saveBlock").classList.remove("hidden-elem");

        var promiseData = {}
        promiseData["promise_id"] = data["promise_id"]
        fetch(PROV_URL + "promise?" + new URLSearchParams(promiseData), {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            credentials: "include", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
            }
        }).then((response) => response.json())
            .then(async (serverPromiseData) => {
                var enc = new TextEncoder("utf-8");
                var id = serverPromiseData["target_file"];
                var idx = id.indexOf("NoteTaker/") + "NoteTaker/".length;
                id = id.substring(idx);
                const clientSig = serverPromiseData["promise_data"]["clientSignature"]
                var sigData = serverPromiseData["promise_data"]["userId"] + id + serverPromiseData["promise_data"]["wrappedKey"] + JSON.stringify(serverPromiseData["promise_data"]["encryptedData"], Object.keys(serverPromiseData["promise_data"]["encryptedData"]).sort());
                const combined = b642ab(clientSig);
                var clientPublicKey = keyStore.getClientPublicKey(serverPromiseData["promise_data"]["host"]);
                
                const encodedClientPublicKey = clientPublicKey;
                const publicClientKey = await window.crypto.subtle.importKey("jwk", encodedClientPublicKey, ECDSA, true, ["verify"]);
                let verified = await window.crypto.subtle.verify(ECDSA, publicClientKey, Int8Array.from(combined), enc.encode(sigData));
                if (!verified) {
                    console.log("signature verification failed");
                    return;
                }

                const wrappedKey = serverPromiseData["promise_data"]["wrappedKey"];
                const wrappedKeyBytes = base64ToBytes(wrappedKey);
                const privateKey = await keyStore.getEncPrivateKey("encryption");
                const tempEncPubKey = await keyStore.getEncPublicKey("encryption");
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

                var rSigData = id + JSON.stringify(reEncryptedData);

                const signingKey = await keyStore.getPrivateKey("signing");
                const rSigBytes = _arrayBufferToBase64(await window.crypto.subtle.sign(
                    ECDSA,
                    signingKey,
                    enc.encode(rSigData)
                ));

                const ownerPublicKey = await keyStore.getEncPublicKey("encryption");
                let wrappedReEncKey = await window.crypto.subtle.wrapKey("raw", reEncKey, ownerPublicKey, {
                    name: "RSA-OAEP",
                });

                output["wrappedReEncKey"] = _arrayBufferToBase64(wrappedReEncKey);

                var rkSigData = id + output["wrappedReEncKey"];

                const rkSigBytes = _arrayBufferToBase64(await window.crypto.subtle.sign(
                    ECDSA,
                    signingKey,
                    enc.encode(rkSigData)
                ));

                output["rSigBytes"] = rSigBytes;
                output["rkSigBytes"] = rkSigBytes;
                output["promise_id"] = data["promise_id"];

                /**var resSigString = id + serverPromiseData["promise_data"]["wrappedKey"];
                const resSigBytes = _arrayBufferToBase64(await window.crypto.subtle.sign(
                    ECDSA,
                    signingKey,
                    enc.encode(rkSigData)
                ));*/

                //TODO this is result of signature check
                output["valid"] = true
                var myHeaders = auth._getHeaders();
                myHeaders["method"] = "POST";
                myHeaders["headers"]["Content-Type"] = "application/json";
                myHeaders["body"] = JSON.stringify(output);
                return fetch(PROV_URL + "promise-fulfilment", myHeaders);
                /**return fetch(PROV_URL + "promise-fulfilment", {
                    method: "POST",
                    mode: "cors",
                    cache: "no-cache",
                    credentials: "include", // include, *same-origin, omit
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(output)
                })*/
            })
            .then(function (response){
                
                return response.text();
            })
            .then((serverData) => {
                endTime = performance.now();
                console.log("Time:" + String((endTime - startTime)));
                if (serverData["status"] == "fulfilled") {

                    /**const promiseId = data["promise_id"];
                    const redirectArgs = {};
                    redirectArgs["status"] = "fulfilled";
                    redirectArgs["action"] = "promise";
                    redirectArgs["agentChanges"] = false;
                    redirectArgs["type"] = serverData["type"];
                    const params = new URLSearchParams(redirectArgs);
                    var redirectUrl = data["redirect"] + "?" + params.toString();
                    window.location = redirectUrl;*/
                }
            })
            .catch(err => {
                console.log(err);
            });

    }

    authorize(data) {
        const url = new URL(data["pk_endpoint"]);
        this.currentURLHost = url.hostname;
        this.uid = data["one_time_url"];
        document.getElementById("verifyUrl").innerText = url.hostname;
        window.showVerifyURL();
        //window.showElement(document.getElementById("verifyUrlBlock"));
        //document.getElementById("verifyUrlBlock").classList.remove("hidden-elem");
    }
    verifyAuthorize() {
        window.showVerifyAuth();
        
        //window.showElement(document.getElementById("OTPBlock"));
        //document.getElementById("verifyUrlBlock").classList.add("hidden-elem");
        //document.getElementById("OTPBlock").classList.remove("hidden-elem");
    }
    verifyDeny() {

    }
    calculateOTP() {
        this.constructKeySignature(document.getElementById("OTP").value);
    }


    async generateKeys() {
        var enc = new TextEncoder("utf-8");
        //P-256
        await window.crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"])
            .then(function (key) {
                const publicKey = key.publicKey;
                const privateKey = key.privateKey;
                this.keystore.setPublicKey("signing", publicKey);
                this.keystore.setPrivateKey("signing", privateKey);
            }.bind(this))
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
            await keyStore.setPublicKey("encryption", publicKey);
            await keyStore.setPrivateKey("encryption", privateKey);
            const encodedEncPublicKey = JSON.parse(keyStore.getEncodedPublicKey("encryption"));
            const output = {};
            output["e"] = encodedEncPublicKey["e"];
            output["kty"] = encodedEncPublicKey["kty"];
            output["n"] = encodedEncPublicKey["n"];
            const jsonPubKeyStr = JSON.stringify(output, Object.keys(output).sort());
            const signingKey = await keyStore.getPrivateKey("signing");
            return window.crypto.subtle.sign(
                ECDSA,
                signingKey,
                enc.encode(jsonPubKeyStr)
            )
        }).then(signature => {
            const stringSignature = _arrayBufferToBase64(signature);
            keyStore.setClientPublicKeySignature(stringSignature);
        }).catch(function (error) {
            console.log("Error generating encryption key pair:" + error);
        });




    }





    constructKeySignature(otp) {
        const encodedKey = JSON.parse(this.keystore.getEncodedPublicKey("signing"));
        const output = {};
        output["crv"] = encodedKey.crv;
        output["kty"] = encodedKey.kty;
        output["x"] = encodedKey.x;
        output["y"] = encodedKey.y;
        const jsonStr = JSON.stringify(output, Object.keys(output).sort());
        const encodedEncPublicKey = JSON.parse(this.keystore.getEncodedPublicKey("encryption"));
        const encoutput = {};
        encoutput["e"] = encodedEncPublicKey["e"];
        encoutput["kty"] = encodedEncPublicKey["kty"];
        encoutput["n"] = encodedEncPublicKey["n"];
        const jsonEncStr = JSON.stringify(encoutput, Object.keys(encoutput).sort());
        this.generateHMAC(otp, CRS + jsonStr + jsonEncStr, this.generateReqID.bind(this));
    }
    generateReqID(hmac, otp) {
        
        this.generateRequestID(otp, CRS, hmac, this.sendKeyHMAC.bind(this));
    }
    sendKeyHMAC(hmac, requestId) {
        const data = {};

        data["ownerEncPublicKey"] = this.keystore.getEncodedPublicKey("encryption");
        //data["ownerEncPublicKeySignature"] = keystore.getClientPublicKeySignature();
        data["publicKey"] = this.keystore.getEncodedPublicKey("signing");
        data["hmac"] = hmac;
        data["requestId"] = requestId;
        fetch(this.receivedData["pk_endpoint"], {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "include", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }).then((response) => response.json())
            .then(function (data) {
                this.receivedKey = data["publicKey"];
                const hmac = data["hmac"];
                const output = {};
                output["crv"] = this.receivedKey.crv;
                output["kty"] = this.receivedKey.kty;
                output["x"] = this.receivedKey.x;
                output["y"] = this.receivedKey.y;
                const jsonStr = JSON.stringify(output, Object.keys(output).sort());

                this.verifyHMAC(document.getElementById("OTP").value, hmac, jsonStr, this.verifyClientHmac.bind(this));
            }.bind(this)).catch(err => {
                console.log(err);
            });

    }

    async verifyClientHmac(result) {
        if (!result) {
            alert("HMAC check failed, cannot continue");
            return;
        }
        var enc = new TextEncoder("utf-8");
        const output = {};
        output["crv"] = this.receivedKey.crv;
        output["kty"] = this.receivedKey.kty;
        output["x"] = this.receivedKey.x;
        output["y"] = this.receivedKey.y;
        const jsonStr = JSON.stringify(output, Object.keys(output).sort());
        const privateKey = await this.keystore.getPrivateKey("signing");
        window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-512" },
            },
            privateKey,
            enc.encode(jsonStr)
        ).then(function (signature) {
            this.keystore.setClientPublicKey(this.currentURLHost, this.receivedKey);
            this.sendSignatureToServer(this.currentURLHost, signature);
        }.bind(this));
    }

    sendSignatureToServer(currentHost, signature) {
        var data = {};
        data["hostname"] = currentHost;
        data["signature"] = _arrayBufferToBase64(signature);
        data["clientPublicKey"] = this.receivedKey;
        var myHeaders = auth._getHeaders();
        myHeaders["method"] = "POST";
        myHeaders["headers"]["Content-Type"] = "application/json";
        myHeaders["body"] = JSON.stringify(data);
        const targetURL = API_URL + auth.userId + "/provider-agent-setup/";
        /**fetch(targetURL, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: myHeaders,
            body: JSON.stringify(data),
        })*/
        fetch(targetURL, myHeaders).then((response) => response.json())

            .then(function (data) {
                if (data["success"]) {
                    var innerdata = {};
                    innerdata["uid"] = this.uid;
                    var innerHeaders = auth._getHeaders();
                    innerHeaders["method"] = "PUT";
                    innerHeaders["headers"]["Content-Type"] = "application/json";
                    innerHeaders["body"]=JSON.stringify(innerdata);
                    const innerTargetURL = API_URL + auth.userId + "/provider-agent-setup/";
                    fetch(innerTargetURL, innerHeaders).then((response) => response.json()).then(data => {
                        if(data["success"]){
                            window.showStatus();
                            
                        }
                    });
                    
                }
            }.bind(this)).catch(err => {
                console.log(err);
            });
    }
    generateHMAC(key, data, callback) {
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
        ).then(key2 => {
            window.crypto.subtle.sign(
                "HMAC",
                key2,
                enc.encode(data)
            ).then(signature => {
                var b = new Uint8Array(signature);
                var str = Array.prototype.map.call(b, x => x.toString(16).padStart(2, '0')).join("")
                callback(str, key);
            });
        });
    }
    generateRequestID(key, data, other_hmac, callback) {
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
                callback(other_hmac, str);
            });
        });
    }

    verifyHMAC(key, signature, data, callback) {
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
                enc.encode(CRS + data)
            ).then(result => {
                callback(result);

            });
        });
    }
}
export const providerAgent = new ProviderAgent();
window.providerAgent = providerAgent;
providerAgent.initProviderAgent();
//providerAgent.reset();

/*
MIT License

Copyright (c) 2020 Egor Nepomnyaschih

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
// This constant can also be computed with the following algorithm:
const base64abc = [],
	A = "A".charCodeAt(0),
	a = "a".charCodeAt(0),
	n = "0".charCodeAt(0);
for (let i = 0; i < 26; ++i) {
	base64abc.push(String.fromCharCode(A + i));
}
for (let i = 0; i < 26; ++i) {
	base64abc.push(String.fromCharCode(a + i));
}
for (let i = 0; i < 10; ++i) {
	base64abc.push(String.fromCharCode(n + i));
}
base64abc.push("+");
base64abc.push("/");
*/
const base64abc = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
	"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
	"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
];

/*
// This constant can also be computed with the following algorithm:
const l = 256, base64codes = new Uint8Array(l);
for (let i = 0; i < l; ++i) {
	base64codes[i] = 255; // invalid character
}
base64abc.forEach((char, index) => {
	base64codes[char.charCodeAt(0)] = index;
});
base64codes["=".charCodeAt(0)] = 0; // ignored anyway, so we just need to prevent an error
*/
const base64codes = [
	255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
	255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
	255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
	52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
	255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
	15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255,
	255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
	41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

function getBase64Code(charCode) {
	if (charCode >= base64codes.length) {
		throw new Error("Unable to parse base64 string.");
	}
	const code = base64codes[charCode];
	if (code === 255) {
		throw new Error("Unable to parse base64 string.");
	}
	return code;
}

function bytesToBase64(bytes) {
	let result = '', i, l = bytes.length;
	for (i = 2; i < l; i += 3) {
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
		result += base64abc[bytes[i] & 0x3F];
	}
	if (i === l + 1) { // 1 octet yet to write
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[(bytes[i - 2] & 0x03) << 4];
		result += "==";
	}
	if (i === l) { // 2 octets yet to write
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += base64abc[(bytes[i - 1] & 0x0F) << 2];
		result += "=";
	}
	return result;
}

function base64ToBytes(str) {
	if (str.length % 4 !== 0) {
		throw new Error("Unable to parse base64 string.");
	}
	const index = str.indexOf("=");
	if (index !== -1 && index < str.length - 2) {
		throw new Error("Unable to parse base64 string.");
	}
	let missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0,
		n = str.length,
		result = new Uint8Array(3 * (n / 4)),
		buffer;
	for (let i = 0, j = 0; i < n; i += 4, j += 3) {
		buffer =
			getBase64Code(str.charCodeAt(i)) << 18 |
			getBase64Code(str.charCodeAt(i + 1)) << 12 |
			getBase64Code(str.charCodeAt(i + 2)) << 6 |
			getBase64Code(str.charCodeAt(i + 3));
		result[j] = buffer >> 16;
		result[j + 1] = (buffer >> 8) & 0xFF;
		result[j + 2] = buffer & 0xFF;
	}
	return result.subarray(0, result.length - missingOctets);
}

function base64encode(str, encoder = new TextEncoder()) {
	return bytesToBase64(encoder.encode(str));
}

function base64decode(str, decoder = new TextDecoder()) {
	return decoder.decode(base64ToBytes(str));
}
