import { OAuth2Client } from "@byteowls/capacitor-oauth2";
import corestatic from './static.js';
/**@Component({
  template: '<button (click)="onOAuthBtnClick()">Login with OAuth</button>' +
   '<button (click)="onOAuthRefreshBtnClick()">Refresh token</button>' +
   '<button (click)="onLogoutClick()">Logout OAuth</button>'
})*/

const oauth2Options = {
  authorizationBaseUrl: "https://resource.apex.dev.castellate.com:5001/oauth/authorize?isAPEX=False",
  accessTokenEndpoint: "https://resource.apex.dev.castellate.com:5001/oauth/token",
  scope: "full",
  resourceUrl: "https://resource.apex.dev.castellate.com:5001/api/v1/users/",
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
    accessTokenEndpoint:'https://resource.apex.dev.castellate.com:5001/oauth/token',
    pkceEnabled:true,
    responseType: "code", // if you configured a android app in google dev console the value must be "code"
    redirectUrl: "com.example.app:/" // package name from google dev console
  },
  ios: {
    appId: "",
    responseType: "code", // if you configured a ios app in google dev console the value must be "code"
    redirectUrl: "com.example.app:/" // Bundle ID from google dev console
  }
}

export class SignupComponent {
  accessToken;
  refreshToken;

  onOAuthBtnClick() {
    console.log("In btn click");
    OAuth2Client.authenticate(
      oauth2Options
    ).then(response => {
      this.accessToken = response["access_token"]; // storage recommended for android logout
      this.refreshToken = response["refresh_token"];

      // only if you include a resourceUrl protected user values are included in the response!
      let oauthUserId = response["id"];
      let name = response["name"];

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
      // Go to backend
    }).catch(reason => {
      console.error("Refreshing token failed", reason);
    });
  }

  onLogoutClick() {
    OAuth2Client.logout(
      oauth2LogoutOptions,
      this.accessToken // only used on android
    ).then(() => {
      // do something
    }).catch(reason => {
      console.error("OAuth logout failed", reason);
    });
  }
}
export const signup = new SignupComponent();
document.getElementById("authButton").addEventListener("click", signup.onOAuthBtnClick);
window.signup = signup;