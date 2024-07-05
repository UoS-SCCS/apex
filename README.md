_This repo is part of the_ **APEX research project**: _a framework for allowing selective sharing of a user's encrypted data with third-party applications.&nbsp;&nbsp;[→ Learn more](https://github.com/apex-authz/info)_
<hr><br>

# Cloud Drive Mobile (APEX Demo)

The Cloud Drive mobile app allows a user of the Cloud Drive storage service to keep the keys for their encrypted files on their mobile device. The keys are protected by a [trusted execution environment (TEE)](https://en.wikipedia.org/wiki/Trusted_execution_environment) or secure co-processor (like the [Titan M2](https://security.googleblog.com/2021/10/pixel-6-setting-new-standard-for-mobile.html)) available on the device and accessed through the [Android Keystore](https://source.android.com/docs/security/features/keystore) APIs.

The app serves as a demonstration of the APEX protocols working in a cross-device fashion with the app acting as the provider agent and invoked by push notification. In a real-world implementation, the app would realistically also provide access to the user's encrypted files from their mobile device (in addition to other features), but this was out of scope for our proof of concept.

> [!WARNING]
> This source code is provided **for demonstration purposes only** and is **not intended for production use**.

The app has been implemented as a web application running in a native wrapper using the [Capacitor](https://capacitorjs.com/) cross-platform development framework. However, it has only been tested to run on Android.

_The files within this repo are made available for use under the terms of the_ **Apache License, Version 2.0**.
<br><br>

## How to Build and Run Cloud Drive Mobile

### Prerequisites

You will need the following software to build and run the app:

- [NodeJS](https://nodejs.org/en) version 16 or greater
- [Android Studio](https://developer.android.com/studio) version 2022.2.1 or greater
- Android SDK version 24[^1] (installed through Android Studio by opening **Tools** > **SDK Manager**)

[^1]: Android SDK version 22 is supposed to be the minimum version supported by Capacitor but, in our testing, version 24 seemed to be the earliest version that actually works.

### Step 1: Prepare Your Environment

First, obtain a copy of this repo and install the necessary dependencies:

```
git clone git@github.com:apex-authz/cloud-drive-mobile.git
cd cloud-drive-mobile
npm install
```

### Step 2: Configure an Emulator in Android Studio

Open the project in Android Studio by running `npx cap open android` in your terminal. Go to **Tools** > **Device Manager** and make sure a device with at least Android 11.0 (API version 30)[^2] is listed. If not, add one by clicking the **Create Device** button.

[^2]: The default web frameworks/tooling used by Capacitor seem to require features present only in fairly new browsers. There may be a way to update the WebView in emulators of older Android versions, but this is left as an exercise for the adventurous reader.

### Step 3: Build the Application

**A.** Prepare a distributable version of the web application using the [Vite](https://vitejs.dev/) build tool:

```
npm run build
```

> [!IMPORTANT]
> If you encounter a **"cannot find module"** error, follow the linked troubleshooting steps:&nbsp;&nbsp;[→ Resolve this error](#cannot-find-module)

**B.** Next, you need to sync the built web application code to the Android Studio project:

```
npx cap sync android
```

**C.** Finally, you can run the app using an Android emulator:

```
npx cap run android
```

If asked to **choose a target device**, select the device with Android 11.0 or greater (API version 30 or greater) added in step 2.

> [!IMPORTANT]
> If you encounter either of these errors, follow the linked troubleshooting steps:
> - **"unable to locate a Java Runtime"**:&nbsp;&nbsp;[→ Resolve this error](#unable-to-locate-a-java-runtime)<br>
> - **"SDK location not found"**:&nbsp;&nbsp;[→ Resolve this error](#unable-to-locate-a-java-runtime)

### Step 4: Configure Firebase Cloud Messaging (FCM)

The [demo server](https://github.com/apex-authz/web-demo) uses [Firebase Cloud Messaging (FCM)](https://github.com/apex-authz/info) to deliver push notifications to the mobile app. You will need to create a new Firebase project from the [Firebase Console](https://console.firebase.google.com/) using your Google account. Then... **[TODO: ADD FURTHER INSTRUCTIONS...]**


## Contributing

To make changes to the source code, simply open the project directory in your editor of choice (e.g., VS Code). Don't make your changes in Android Studio directly.

When you are ready to test your changes, run the commands given in step 3 again to build the app, sync the Android project, and run the app in the emulator.

### Debugging

You can attach a debugger to the Capacitor app running in the emulator by opening Google Chrome on your desktop and navigating to the address `chrome://inspect`.


## Troubleshooting

### "Cannot find module"

You may encounter this error when trying to build the distributable version of the web app (step 3A):

> Error: Cannot find module '/Users/js/code/apex/cloud-drive-mobile/my-app/build'<br>
> &nbsp;&nbsp;&nbsp;&nbsp;at Module._resolveFilename (node:internal/modules/cjs/loader:1142:15)<br>
> &nbsp;&nbsp;&nbsp;&nbsp;at Module._load (node:internal/modules/cjs/loader:983:27)<br>
> &nbsp;&nbsp;&nbsp;&nbsp;at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:142:12)<br>
> &nbsp;&nbsp;&nbsp;&nbsp;at node:internal/main/run_main_module:28:49 {<br>
> &nbsp;&nbsp;code: 'MODULE_NOT_FOUND',<br>
> &nbsp;&nbsp;requireStack: []<br>
> }

This happens if you mistype the command to perform the build. The command should be <code>np<b>m</b> run build</code> and **NOT** <code>np<b>x</b> run build</code>.

### "Unable to locate a Java Runtime"

If you encounter this error when trying to run the application in the emulator (step 3C), you need to add the Java runtime to your system path.

In Android Studio, open **Preferences** or **Settings** (depending on your platform) and navigate to **Build, Execution, Deployment** > **Build Tools** > **Gradle**.

Take note of the path given in the **Gradle JDK** field. For example, on a Mac, this might be: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`

Edit your `~/.bashrc` (on most systems) or `~/.bash_profile` (on a Mac) file to contain the following line (replace the given path with the one obtained from Android Studio): 

```
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

You will need to restart your terminal for the changes to take affect (or run `source ~/.bashrc` or `source ~/.bash_profile`).

### "SDK location not found"

You may encounter this error when trying to run the application in the emulator (step 3C):

> FAILURE: Build failed with an exception.
>
> \* What went wrong:<br>
> Could not determine the dependencies of task ':app:compileDebugJavaWithJavac'.<br>
> \> Could not determine the dependencies of null.<br>
> \> SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file at 'cloud-drive-mobile/android/local.properties'.

To fix this, you will need to determine the path of the installed Android SDK. In Android Studio, navigate to **Tools** > **SDK Manager** and take note of the path given in the **Android SDK Location** field. For instance, on a Mac, this is usually `$HOME/Library/Android/sdk`.

Edit your `~/.bashrc` (on most systems) or `~/.bash_profile` (on a Mac) file to contain the following line (replace the given path with the one obtained from Android Studio): 

```
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

You will need to restart your terminal for the changes to take affect (or run `source ~/.bashrc` or `source ~/.bash_profile`).