# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane

DRIVE_HOME = "http://127.0.0.1:5001"
CLIENT_HOST = "127.0.0.3:5003"

CORS_ORIGINS = [
    "http://127.0.0.1:5001",
    "http://127.0.0.2:5002",
    "http://localhost:5001",
    "http://localhost:5002",
    "http://localhost"
]

##
# Replace with client ID and client secret obtained by registering a new OAuth app with Cloud Drive
##
MYDRIVE_CLIENT_ID="4pbte8enfRyOwrwduTKXGAqc"
MYDRIVE_CLIENT_SECRET="MS0p3Uplh6MRenN6oBUtYWoQyWBfgEjD95BH9MxaHzdO7FVx"


MYDRIVE_ACCESS_TOKEN_URL = f"{DRIVE_HOME}/oauth/token"
MYDRIVE_REFRESH_TOKEN_URL = f"{DRIVE_HOME}/oauth/token"
MYDRIVE_AUTHORIZE_URL = f"{DRIVE_HOME}/oauth/authorize?isAPEX=True"
MYDRIVE_CLIENT_KWARGS = {'scope': 'full'}
MYDRIVE_API_BASE_URL = f"{DRIVE_HOME}/api/v1/users/"
RESOURCE_PROFILE_URL = f"{DRIVE_HOME}/profile/"
RESOURCE_API_URL = f"{DRIVE_HOME}/api/v1/users/1/files/"

CRS = "APEXNotesLink"