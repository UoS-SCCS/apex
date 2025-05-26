import { OAuth2Client } from "@byteowls/capacitor-oauth2";
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Device } from '@capacitor/device';
import corestatic from './static.js';
/**@Component({
  template: '<button (click)="onOAuthBtnClick()">Login with OAuth</button>' +
   '<button (click)="onOAuthRefreshBtnClick()">Refresh token</button>' +
   '<button (click)="onLogoutClick()">Logout OAuth</button>'
})*/
const API_URL = "https://resource.apex.dev.castellate.com:5001/api/v1/users/";
const oauth2Options = {
  authorizationBaseUrl: "https://resource.apex.dev.castellate.com:5001/oauth/authorize?isAPEX=False",
  accessTokenEndpoint: "https://resource.apex.dev.castellate.com:5001/oauth/token",
  scope: "full",
  resourceUrl: "https://resource.apex.dev.castellate.com:5001/profile/",
  logsEnabled: true,
  web: {
    appId: "",
    responseType: "token", // implicit flow
    accessTokenEndpoint: "", // clear the tokenEndpoint as we know that implicit flow gets the accessToken from the authorizationRequest
    redirectUrl: "http://localhost:4200",
    windowOptions: "height=600,left=0,top=0"
  },
  android: {
    appId: 'MEqM8IrtxHBtqpTR8Hc66k61',
    accessTokenEndpoint: 'https://resource.apex.dev.castellate.com:5001/oauth/token',
    pkceEnabled: true,
    responseType: "code", // if you configured a android app in google dev console the value must be "code"
    redirectUrl: "com.castellate.dev.apex:/" // package name from google dev console
  },
  ios: {
    appId: "",
    responseType: "code", // if you configured a ios app in google dev console the value must be "code"
    redirectUrl: "com.castellate.dev.apex:/" // Bundle ID from google dev console
  }
}
class Storage {
  static ACCESS_TOKEN = "access_token";
  static REFRESH_TOKEN = "refresh_token";
  static USER_ID = "user_id";

  static CURRENT_UID = "current_uid";
  static DATA = "data";

  static async clear() {
    return (await SecureStoragePlugin.clear());
  }

  static async getKeys() {
    return (await SecureStoragePlugin.keys())["value"];
  }
  static async getAccessToken(uid) {
    try {
      if ((await this.getKeys()).includes(Storage.DATA)) {
        var data = JSON.parse((await SecureStoragePlugin.get({ "key": Storage.DATA }))["value"]);
        if (uid in data && Storage.ACCESS_TOKEN in data[uid]) {
          return data[uid][Storage.ACCESS_TOKEN];
        }
        console.log('Item with specified key does not exist.');
        return null;
        /**if(Storage.ACCESS_TOKEN in data){
          return data[]
        }
        //This shouldn't be require, but for some reason an object is being returned not the value
        return (await SecureStoragePlugin.get({ "key": Storage.ACCESS_TOKEN }))["value"];*/
      }
    } catch (error) {
      console.log('Item with specified key does not exist.');
      return null;
    }
  }
  static async getRefreshToken(uid) {
    try {
      if ((await this.getKeys()).includes(Storage.DATA)) {
        var data = JSON.parse((await SecureStoragePlugin.get({ "key": Storage.DATA }))["value"]);
        if (uid in data && Storage.REFRESH_TOKEN in data[uid]) {
          return data[uid][Storage.REFRESH_TOKEN];
        }
        console.log('Item with specified key does not exist.');
        return null;
      }
      /**if ((await this.getKeys()).includes(Storage.REFRESH_TOKEN)) {
        return (await SecureStoragePlugin.get({ "key": Storage.REFRESH_TOKEN }))["value"];
      }*/
    } catch (error) {
      console.log('Item with specified key does not exist.');
      return null;
    }
  }
  static async getUserId() {
    try {

      if ((await this.getKeys()).includes(Storage.CURRENT_UID)) {
        return Number((await SecureStoragePlugin.get({ "key": Storage.CURRENT_UID }))["value"]);
      } else {
        return null;
      }
    } catch (error) {
      console.log('Item with specified key does not exist.');
      return null;
    }
  }
  static async setAccessToken(uid, token) {
    var data = {};
    if ((await this.getKeys()).includes(Storage.DATA)) {
      data = JSON.parse((await SecureStoragePlugin.get({ "key": Storage.DATA }))["value"]);
    }
    if (!(uid in data)) {
      data[uid]={};
    }
    data[uid][Storage.ACCESS_TOKEN] = token;
    await SecureStoragePlugin.set({ "key": Storage.DATA, "value": JSON.stringify(data) });
  }
  static async setRefreshToken(uid, token) {
    var data = {};
    if ((await this.getKeys()).includes(Storage.DATA)) {
      data = JSON.parse((await SecureStoragePlugin.get({ "key": Storage.DATA }))["value"]);
    }
    if (!(uid in data)) {
      data[uid]={};
    }
    data[uid][Storage.REFRESH_TOKEN] = token;
    await SecureStoragePlugin.set({ "key": Storage.DATA, "value": JSON.stringify(data) });
  }
  static async setUserId(token) {
    await SecureStoragePlugin.set({ "key": Storage.CURRENT_UID, "value": token });
  }
  static async logoutUser(uid) {
    if ((await this.getKeys()).includes(Storage.CURRENT_UID)) {
      await SecureStoragePlugin.remove({ "key": Storage.CURRENT_UID });
    }
  }
  static async removeAllTokens(uid) {
    var data = {};
    if ((await this.getKeys()).includes(Storage.DATA)) {
      data = JSON.parse((await SecureStoragePlugin.get({ "key": Storage.DATA }))["value"]);
    }
    if (uid in data) {
      delete data[uid];
    }
    await SecureStoragePlugin.set({ "key": Storage.DATA, "value": JSON.stringify(data) });
    /**
    if ((await this.getKeys()).includes(Storage.ACCESS_TOKEN)) {
      await SecureStoragePlugin.remove({ "key": Storage.ACCESS_TOKEN });
    }
    if ((await this.getKeys()).includes(Storage.REFRESH_TOKEN)) {
      await SecureStoragePlugin.remove({ "key": Storage.REFRESH_TOKEN });
    }
    if ((await this.getKeys()).includes(Storage.USER_ID)) {
      await SecureStoragePlugin.remove({ "key": Storage.USER_ID });
    }*/
    /**await SecureStoragePlugin.get({ "key": Storage.ACCESS_TOKEN })
      .then(value => {
        
      })
      .catch(error => {
        //console.log('Item with specified key does not exist.');
      });
    await SecureStoragePlugin.get({ "key": Storage.REFRESH_TOKEN })
      .then(value => {
        SecureStoragePlugin.remove({ "key": Storage.REFRESH_TOKEN })
      })
      .catch(error => {
        //console.log('Item with specified key does not exist.');
      });
    await SecureStoragePlugin.get({ "key": Storage.USER_ID })
      .then(value => {
        SecureStoragePlugin.remove({ "key": Storage.USER_ID })
      })
      .catch(error => {
        //console.log('Item with specified key does not exist.');
      });*/
  }
}
export class AuthComponent {
  accessToken;
  refreshToken;
  userId;
  hasCredentials = false;
  loggedIn = false;
  fcmTokenToSave = null;
  currentFcmToken = null;
  constructor() {
    this.loggedIn = false;
  }
  async init() {
    this.userId = await Storage.getUserId();
    if (this.userId != null) {
      this.accessToken = await Storage.getAccessToken(this.userId);
      this.refreshToken = await Storage.getRefreshToken(this.userId);
    }
    console.log(this.accessToken);
    if (this.accessToken != null && this.userId != null) {
      this.hasCredentials = true;
      this.checkLoggedIn();
    } else {
      console.log("credentials don't exist");
      window.showLogin();
    }
  };

  _getHeaders() {
    var headers = {};
    headers["headers"] = {};
    headers["headers"]["Authorization"] = "Bearer " + this.accessToken;
    return headers;
  }
  async _registerFCM() {
    console.log("Updating FCM")
    const url = API_URL + this.userId + "/provider-agent/"
    var headers = this._getHeaders();
    headers["method"] = "PUT";
    headers["headers"]["Content-Type"] = "application/json";
    var data = {};
    data["fcmID"] = window.fcmID;
    data["deviceID"] = (await Device.getId())["identifier"];
    headers["body"] = JSON.stringify(data);


    fetch(url, headers).then(function (response) {
      if (response.ok) {
        console.log("FCM Registered");
      } else {
        console.log(JSON.stringify(response));
      }
    }.bind(this)).catch(function (err) {
      console.log(err);
      this.loggedIn = false;
    });
  }
  async checkLoggedIn() {

    if (this.userId != null) {
      console.log("UserId:" + String(this.userId));
      //"/users/<user_id>/provider-agent/"
      const url = API_URL + this.userId + "/provider-agent/"
      fetch(url, this._getHeaders()).then(function (response) {
        if (response.ok) {
          console.log("Logged in");
          this.loggedIn = true;
          if (this.fcmTokenToSave != null) {
            this._registerFCM();
          }
        } else {
          console.log(JSON.stringify(response));
        }
        window.showStatus();
      }.bind(this)).catch(function (err) {
        console.log(err);
        this.loggedIn = false;
      });
    }
  }

  updateFCM(token) {
    this.currentFcmToken = token;
    if (this.loggedIn) {
      this._registerFCM();
    } else {
      this.fcmTokenToSave = token;
    }

  }
  onOAuthBtnClick() {
    this.fcmTokenToSave = this.currentFcmToken;
    OAuth2Client.authenticate(
      oauth2Options
    ).then(async response => {
      this.accessToken = response["access_token"]; // storage recommended for android logout
      this.refreshToken = response["refresh_token"];
      console.log("RefreshTokenReceived:" + this.refreshToken);
      // only if you include a resourceUrl protected user values are included in the response!
      this.userId = response["user_id"];
      await Storage.setAccessToken(this.userId.toString(),this.accessToken);
      await Storage.setRefreshToken(this.userId.toString(),this.refreshToken);
      await Storage.setUserId(this.userId.toString());
      window.auth.checkLoggedIn();

      // go to backend
    }).catch(reason => {
      console.log(reason);
      console.error("OAuth rejected", reason);
    });
  }

  // Refreshing tokens only works on iOS/Android for now
  onOAuthRefreshBtnClick() {
    if (!this.refreshToken) {
      console.error("No refresh token found. Log in with OAuth first.");
    }

    OAuth2Client.refreshToken(
      oauth2RefreshOptions
    ).then(response => {
      this.accessToken = response["access_token"]; // storage recommended for android logout
      // Don't forget to store the new refresh token as well!
      this.refreshToken = response["refresh_token"];
      Storage.setAccessToken(this.userId.toString(),this.accessToken);
      Storage.setRefreshToken(this.userId.toString(),this.refreshToken);

      // Go to backend
    }).catch(reason => {
      console.error("Refreshing token failed", reason);
    });
  }

  async onLogoutClick() {
    Storage.logoutUser().then(() => { window.showLogin(); });
    //Storage.removeAllTokens().then(() => { window.showLogin(); });

  }
  async onResetClick() {
    Storage.clear().then(() => { window.showLogin(); });
    //Storage.removeAllTokens().then(() => { window.showLogin(); });

  }
}
export const auth = new AuthComponent();
document.getElementById("authButton").addEventListener("click", auth.onOAuthBtnClick);
document.getElementById("logoutButton").addEventListener("click", auth.onLogoutClick);
document.getElementById("resetButton").addEventListener("click", auth.onResetClick);


window.auth = auth;