# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane

CORS_ORIGINS = [
    "http://127.0.0.1:5001",
    "http://127.0.0.2:5002",
    "http://localhost:5001",
    "http://localhost:5002",
    "http://localhost"
]

##
# Replace with path to JSON file containing your Firebase service account private key
# See https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments
##
GOOGLE_CREDENTIAL_FILE_PATH = "./firebase-adminsdk.json"