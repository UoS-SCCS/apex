window.onload = function () {
    initProviderAgent();
    keystore = new KeyStore();
    if(!keystore.isInitialised()){
        generateKeys();
    }
    const current_URL = new URL(window.location.href);
    if (current_URL.searchParams.has("jsonData")) {
        const jsonData = JSON.parse(current_URL.searchParams.get("jsonData"));
        receivedData = jsonData;
        if (jsonData["action"] == "authorize") {
            authorize(jsonData);
        }
    }
    window.opener.postMessage("Testing","*");
    
}
var receivedData={};
var currentURLHost = null;
function initProviderAgent() {

}
function authorize(data) {
    const url = new URL(data["pk_endpoint"]);
    currentURLHost = url.hostname;
    document.getElementById("verifyUrl").innerText = url.hostname;
    document.getElementById("verifyUrlBlock").classList.remove("hidden-elem");
}
function verifyAuthorize(){
    document.getElementById("verifyUrlBlock").classList.add("hidden-elem");
    document.getElementById("OTPBlock").classList.remove("hidden-elem");
}
function calculateOTP(){
    
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

function generateKeys() {
    //P-256
    window.crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"])
        .then(function (key) {
            const publicKey = key.publicKey;
            const privateKey = key.privateKey;
            keystore.setPublicKey("signing", publicKey);
            keystore.setPrivateKey("signing", privateKey);
        })
        .catch(function (error) {
            console.log("Error generating key pair:" + error);
        });
}





function constructKeySignature(otp){
    const encodedKey = JSON.parse(keystore.getEncodedPublicKey("signing"));
    const output = {};
    output["crv"]=encodedKey.crv;
    output["kty"]=encodedKey.kty;
    output["x"]=encodedKey.x;
    output["y"]=encodedKey.y;
    const jsonStr = JSON.stringify(output, Object.keys(output).sort());
    console.log(jsonStr);
    console.log(output);
    generateHMAC(otp,jsonStr,sendKeyHMAC);
}
function sendKeyHMAC(hmac){
    const data = {};
    data["publicKey"]=keystore.getEncodedPublicKey("signing");
    data["hmac"]=hmac;
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
    .then(data =>{
        console.log(data);
        receivedKey = data["publicKey"];
        const hmac = data["hmac"];
        const output = {};
        output["crv"]=receivedKey.crv;
        output["kty"]=receivedKey.kty;
        output["x"]=receivedKey.x;
        output["y"]=receivedKey.y;
        const jsonStr = JSON.stringify(output, Object.keys(output).sort());
        
        verifyHMAC(document.getElementById("OTP").value,hmac,jsonStr,verifyClientHmac);
    }).catch(err =>{
        console.log(err);
    });
    
}
var receivedKey;
async function verifyClientHmac(result){
    var enc = new TextEncoder("utf-8");
    const output = {};
    output["crv"]=receivedKey.crv;
    output["kty"]=receivedKey.kty;
    output["x"]=receivedKey.x;
    output["y"]=receivedKey.y;
    const jsonStr = JSON.stringify(output, Object.keys(output).sort());
    const privateKey = await keystore.getPrivateKey("signing");
    console.log(privateKey);
    window.crypto.subtle.sign(
        {
          name: "ECDSA",
          hash: { name: "SHA-512" },
        },
        privateKey,
        enc.encode(jsonStr)
      ).then(signature => {
        keystore.setClientPublicKey(currentURLHost,receivedKey);
        sendSignatureToServer(currentURLHost,signature);
      });
}
const PROVIDER_CERT_ENDPOINT="http://127.0.0.1:5000/client_cert_endpoint";
function sendSignatureToServer(currentHost,signature){
    var data = {};
    data["hostname"]=currentHost;
    data["signature"]=signature;
    data["clientPublicKey"]=receivedKey
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
  .then(data =>{
      console.log(data);

      if(data["success"]){
        window.opener.postMessage("complete","*");
      }
  }).catch(err =>{
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

function verifyHMAC(key, signature, data, callback) {
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
        window.crypto.subtle.verify(
            "HMAC",
            key,
            enc.encode(signature),
            enc.encode(data)
        ).then(result => {
            callback(result);
            
        });
    });
}
/**
function loadPublicKey() {

}
function importPrivateKeyAndSign() {
    //importKey private key
    //jwk
    window.crypto.subtle.importKey("jwk", JSON.parse(jwkPrivateKeyJSON), ECDSA, false, ["sign"])
        .then(function (key) {
            window.crypto.subtle.sign(ECDSA, key, TESTBYTES)
                .then(function (sig) {
                    console.log("Signature: " + sig);
                    signatureBASE64 = _arrayBufferToBase64(sig);
                    next(signatureBASE64, importPublicKeyAndVerify);
                })
                .catch(error("Signing failed."));
        })
        .catch(error("Import private key from JWK JSON failed."));
}

function importPublicKeyAndVerify() {
    //importKey public key
    //jwk
    window.crypto.subtle.importKey("jwk", JSON.parse(jwkPublicKeyJSON), ECDSA, false, ["verify"])
        .then(function (key) {
            var sig = _base64ToArrayBuffer(signatureBASE64);
            window.crypto.subtle.verify(ECDSA, key, sig, TESTBYTES)
                .then(function (success) {
                    if (success) {
                        console.log("Verified successfully.");
                    } else {
                        console.error("Verification returned 'false'!");
                    }
                    next(null, importPublicKeyAndVerifyTamperedData);
                })
                .catch(error("Verification failed."));
        })
        .catch(error("Import public key from JWK JSON failed."));

}

// Just to make sure, that verification actually detects tampered data!
function importPublicKeyAndVerifyTamperedData() {
    //importKey public key
    //jwk
    window.crypto.subtle.importKey("jwk", JSON.parse(jwkPublicKeyJSON), ECDSA, false, ["verify"])
        .then(function (key) {
            var sig = _base64ToArrayBuffer(signatureBASE64);
            window.crypto.subtle.verify(ECDSA, key, sig, TESTBYTES_TAMPERED)
                .then(function (success) {
                    if (success) {
                        console.error("Verified successfully -- should NOT since it's tampered data!");
                    } else {
                        console.log("Verification returned 'false'! That's OK since it's tampered data.");
                    }
                })
                .catch(error("Verification failed."));
        })
        .catch(error("Import public key from JWK JSON failed."));

}
 */