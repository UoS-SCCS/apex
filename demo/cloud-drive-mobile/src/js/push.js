import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { providerAgent } from "./provider-agent";
window.fcmID = "";
function initPushNotifications() {
  console.log('Initializing Push Notifications');

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will just grant without prompting
  PushNotifications.requestPermissions().then(result => {
    if (result.receive === 'granted') {
      // Register with Apple / Google to receive push via APNS/FCM
      console.log("Registering")
      PushNotifications.register();
    } else {
      // Show some error
    }
  });

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration',
    (token) => {
      console.log("Registration")
      window.fcmID = token.value;
      window.auth.updateFCM(window.fcmID);
      console.log(token.value);
      //alert('Push registration success, token: ' + token.value);
    }
  );

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError',
    (error) => {
      alert('Error on registration: ' + JSON.stringify(error));
    }
  );

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived',
    (notification) => {
      //alert('Push received: ' + JSON.stringify(notification));
      var data =notification["data"];
      providerAgent.processMessage(data);
    }
  );

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed',
    (notification) => {
      alert('Push action performed: ' + JSON.stringify(notification));
    }
  );
}
window.initPushNotifications = initPushNotifications;
