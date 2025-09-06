[APEX Repo](../../..) ⟩ Demo

_This directory is part of the_ **APEX research project**: _a framework to enable selective sharing of a user's encrypted data with third-party applications.&nbsp; [→&nbsp;Learn&nbsp;more](https://uos-sccs.github.io/apex)_
<hr><br>

# APEX Demo Implementation

We have provided a proof-of-concept implementation of the APEX protocol suite to demonstrate its capabilities and show how it can be integrated into an existing implementation of OAuth 2.0. Our demo consists of the following three units:

- [**Cloud Drive** web service](cloud-drive-web)
- [**Cloud Drive** mobile app](cloud-drive-mobile)
- [**Cloud Notes** web app](cloud-notes)

For more details, refer to §4 of [our paper](https://uos-sccs.github.io/apex).

> [!WARNING]
> This source code is provided **for demonstration purposes only** and is **not intended for production use**.

_The APEX demo may be used under the terms of the_ **Apache License, Version 2.0**_.&nbsp; [→&nbsp;Read&nbsp;license&nbsp;text](LICENSE)_
<br><br>


## How to Run the Cloud Drive and Cloud Notes Web Applications

### Step 1: Fetch Source Code

First, obtain a copy of this repo:

```
git clone git@github.com:uos-sccs/apex.git
cd apex/demo
```

### Step 2: Install Dependencies

Make sure Python 3.10.17 (or comparable) and [Pipenv](https://pipenv.pypa.io/) (often bundled with Python) are installed. For example, using the [asdf](https://asdf-vm.com/) version manager:

```
asdf plugin add python
asdf install python 3.10.17
```

Next, use Pipenv to set up a new virtual environment and install the necessary Pip packages within:

```
pipenv --python 3.10.17 install
```

### Step 2: Start the Web Servers

From the demo directory, enter the virtual environment created and set up by Pipenv. Then, run the launch script:

```
pipenv shell
sudo python3 launch.py
```

This will start three web servers:

- Main web application server for Cloud Drive at 127.0.0.1:5001
- Provider agent server for Cloud Drive (for encrypting/decrypting APEX resources) at 127.0.0.2:5002
- Web application server for Cloud Notes at 127.0.0.3:5003

You can also run these individually:

```
sudo flask --app cloud-drive-web/web-app run --host 127.0.0.1 --port 5001 --debug
sudo flask --app cloud-drive-web/provider-agent run --host 127.0.0.2 --port 5002 --debug
sudo flask --app cloud-notes run --host 127.0.0.3 --port 5003 --debug
```

> [!IMPORTANT]
> On a Mac, you may encounter a **"can't assign requested address"** error. If so, follow the linked troubleshooting steps:&nbsp; [→&nbsp;Resolve&nbsp;this&nbsp;error](#cant-assign-requested-address)

### Step 3: Open the Web Apps in Your Browser

Navigate to the **Cloud Drive** and **Cloud Notes** web applications by accessing the following URLs:

- **Cloud Drive**: [http://127.0.0.1:5001](http://127.0.0.1:5001)
- **Cloud Notes**: [http://127.0.0.3:5003](http://127.0.0.1:5003)


## Testing Cross-App Resource Access in Browser

### Step 1: Register Cloud Notes as a Consumer of the Cloud Drive API

Navigate to the **Cloud Drive** web app at [http://127.0.0.1:5001](http://127.0.0.1:5001) and register a new account. You may wish to use "dev@example.com" or similar for the email address.

Log in using your newly-created developer account, navigate to the **Developer** tab and click **Create Client**. Enter the following details:

- client_uri: http://127.0.0.3:5003
- redirect_uri: http://127.0.0.3:5003/authorize
- pk_endpoint: http://127.0.0.3:5003/pk_endpoint

You can leave the other fields blank.

### Step 2: Update Cloud Notes Configuration

Copy the `client_id` and `client_secret` from the **Developer** tab and paste them in `demo/cloud-notes/config.py`. Then, restart the **Cloud Notes** server.

### Step 3: Create New User Accounts and Link Them

In the **Cloud Drive** app:

1. If you are still logged into your developer account created earlier, sign out.
2. Create a new account by clicking **Sign up**.
3. You will be taken to the login page. Enter your new credentials and click **Login**.

Navigate to **Cloud Notes** app at [http://127.0.0.3:5003](http://127.0.0.1:5003). Then:

1. Create a new account by clicking **Sign up**.
2. You will be taken to the login page. Enter your new credentials and click **Login**.
3. Click the **Link to MyDrive** button.
4. Copy the one-time-code (OTC) that is shown. Click **Continue**.
5. Click the **Open Provider Agent** button. (You may need to allow pop-ups.)
6. Click **Authorize** to grant access to **127.0.0.3:5003**.
7. You will be prompted for the OTC. Paste it in the text field and press **Continue**.

This demonstrates how authorisation is delegated using OAuth 2.0 and APEX and how consumer–provider agent authentication works using the OTP.

### Step 4: Create an Unencrypted Note

In the **Cloud Notes** app:

1. Click the **Create new note** button.
2. Enter a name for the note. Click **OK**.
3. The note will appear in the left sidebar. Click it to view.
4. Enter some text in the area on the right. Click the 💾 icon in the toolbar to save.
5. Refresh the page and click the note again to confirm that the contents were saved.

This demonstrates a note being created with plain OAuth 2.0.

### Step 5: Create an Encrypted Note

In the **Cloud Notes** app:

1. Click the **Create new APEX note** button.

2. Enter a name for the note. Click **OK**.

    _A pop-up window should appear displaying first the **consumer agent** and then the **provider agent**. These are scripts which run in browser and encrypt the note on behalf of the user. (You may need to allow pop-ups.)_

3. The note will appear in the left sidebar. Click it to view.

    _The **consumer agent** and then the **provider agent** should appear again to decrypt the note received from Cloud Drive._

4. Enter some text in the area on the right. Click the icon in the toolbar to save.

    _Once again the **consumer agent** and **provider agent** appear._

5. Refresh the page and click the note again to confirm that the contents were saved.

This demonstrates a note being created with OAuth 2.0 extended with APEX.


## Testing Cross-Device Resource Access

To try out cross-device encrypted resource access, build and run the **Cloud Drive** mobile app. Refer to [these instructions](cloud-drive-mobile#how-to-build-and-run-cloud-drive-mobile).


## Troubleshooting

### "Can't assign requested address"

You may encounter this message if you aren't starting one or more servers as root. Retry with `sudo`.

Otherwise, it may be that the necessary route does not exist. This is likely on macOS which only routes 127.0.0.1 to the loopback interface by default, rather than the entire /24 subnet. To fix this, create additional routes for the other two loopback addresses used:

```
sudo ifconfig lo0 alias 127.0.0.2 up
sudo ifconfig lo0 alias 127.0.0.3 up
```