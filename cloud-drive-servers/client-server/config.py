# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane
RESOURCE_PROFILE_URL = "https://resource.apex.dev.castellate.com:5001/profile/"
RESOURCE_API_URL = "https://resource.apex.dev.castellate.com:5001/api/v1/users/1/files/"
CLIENT_HOST = "client.apex.dev.castellate.com"
CORS_ORIGINS = origins = [
    "http://localhost",
    "http://127.0.0.1:5000",
    "http://127.0.0.3:5000",
    "http://localhost:5000",
    "http://10.0.2.2:5000",
    "https://client.apex.dev.castellate.com:5001",
    "https://resource.apex.dev.castellate.com:5001",
    "https://resource.apex.dev.castellate.com:5002",
]
MYDRIVE_CLIENT_ID="4pbte8enfRyOwrwduTKXGAqc"
MYDRIVE_CLIENT_SECRET="MS0p3Uplh6MRenN6oBUtYWoQyWBfgEjD95BH9MxaHzdO7FVx"
MYDRIVE_ACCESS_TOKEN_URL="https://resource.apex.dev.castellate.com:5001/oauth/token"
MYDRIVE_REFRESH_TOKEN_URL="https://resource.apex.dev.castellate.com:5001/oauth/token"
MYDRIVE_AUTHORIZE_URL="https://resource.apex.dev.castellate.com:5001/oauth/authorize?isAPEX=True"
MYDRIVE_CLIENT_KWARGS={'scope': 'full'}
MYDRIVE_API_BASE_URL="https://resource.apex.dev.castellate.com:5001/api/v1/users/"
CRS = "APEXNotesLink"