import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
const RSA = {
    name: "RSA-OAEP",
    hash: "SHA-256"
}
const KS_ECDSA = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: {
        name: "SHA-256"
    },
}
export class KeyStore {
    constructor() {
        this._ks = {};
        //(async () => {await SecureStoragePlugin.clear();});
        /**this.setPublicKey = this.setPublicKey.bind(this)
        this.getPrivateKey = this.getPrivateKey.bind(this)
        this.getPublicKey = this.getPublicKey.bind(this)
        this.setPrivateKey = this.setPrivateKey.bind(this)*/
        this.store = this.store.bind(this);
        this.initialised = false;
    }
    async clear(){
        await SecureStoragePlugin.clear();
    }
    async initKeystore(){
        try {
            var ks_data =await SecureStoragePlugin.get({ "key": "keystore" });
            this._ks = JSON.parse(ks_data["value"]);
            this.initialised = true;
            return;
        } catch (error) {
            console.log(error);
        }
    }
    isInitialised(){
        return this.initialised;
    }
    setClientPublicKey(clientHost,publicKey){
        if(!("clientPublicKeys" in this._ks)){
            this._ks["clientPublicKeys"]={};
        }
        this._ks["clientPublicKeys"][clientHost]=publicKey;
        this.store();
    }
    getClientPublicKey(clientHost){
        if("clientPublicKeys" in this._ks && clientHost in this._ks["clientPublicKeys"]){
            return this._ks["clientPublicKeys"][clientHost]
        }
        return null;
    }
    async getPrivateKey(name) {
        if (name in this._ks) {
            const encodedKey = JSON.parse(this._ks[name]["privateKey"]);
            const privateKey = await window.crypto.subtle.importKey("jwk", encodedKey, KS_ECDSA, true, ["sign"]);
            return privateKey;
        }
        return null;
    }
    async getPublicKey(name) {
        if (name in this._ks) {
            const encodedKey = JSON.parse(this._ks[name]["publicKey"]);
            const publicKey = await window.crypto.subtle.importKey("jwk", encodedKey, KS_ECDSA, true, ["verify"]);
            return publicKey;
        }
        return null;
    }
    async getEncPrivateKey(name) {
        if (name in this._ks) {
            const encodedKey = JSON.parse(this._ks[name]["privateKey"]);
            const privateKey = await window.crypto.subtle.importKey("jwk", encodedKey, RSA, true, ["decrypt", "unwrapKey"]);
            return privateKey;
        }
        return null;
    }
    async getEncPublicKey(name) {
        if (name in this._ks) {
            const encodedKey = JSON.parse(this._ks[name]["publicKey"]);
            const publicKey = await window.crypto.subtle.importKey("jwk", encodedKey, RSA, true, ["encrypt", "wrapKey"]);
            return publicKey;
        }
        return null;
    }
    getEncodedPublicKey(name){
        if (name in this._ks) {
            return this._ks[name]["publicKey"];
        }
        return null;
    }
    
    async setPrivateKey(name, key) {
        const innerKs = this;
        await window.crypto.subtle.exportKey("jwk", key)
            .then(function (encodedKey) {
                if (!(name in innerKs._ks)){
                    innerKs._ks[name] = {};
                }
                innerKs._ks[name]["privateKey"] = JSON.stringify(encodedKey);
                innerKs.store();
            })
            .catch(function (error) {
                console.log("Error saving private key:" + error);
            })
    }
    async setPublicKey(name, key) {
        const innerKs = this;
        await window.crypto.subtle.exportKey("jwk", key)
            .then(function (encodedKey) {
                if (!(name in innerKs._ks)){
                    innerKs._ks[name] = {};
                }
                innerKs._ks[name]["publicKey"] = JSON.stringify(encodedKey);
                innerKs.store();
            })
            .catch(function (error) {
                console.log("Error saving public key:" + error);
            });
    }
    setClientPublicKeySignature(signature){
        this._ks["publicKeySignature"]=signature;
        this.store();
    }
    getClientPublicKeySignature(){
        return this._ks["publicKeySignature"];
    }
    store() {
        SecureStoragePlugin.set({ "key":"keystore", "value":JSON.stringify(this._ks) }).then(success => console.log("Updated KeyStore:" + String(success)));
        //window.localStorage.setItem("keystore",);
    }
}
export const keyStore = new KeyStore();
window.keyStore = keyStore;