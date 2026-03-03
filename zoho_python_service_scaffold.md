# Python Zoho Service Layer Scaffold

Generated: 2026-03-03

## Requirements

pip install requests python-dotenv

## oauth.py

``` python
import requests
import os

def refresh_access_token():
    url = "https://accounts.zoho.com/oauth/v2/token"
    params = {
        "refresh_token": os.getenv("REFRESH_TOKEN"),
        "client_id": os.getenv("CLIENT_ID"),
        "client_secret": os.getenv("CLIENT_SECRET"),
        "grant_type": "refresh_token"
    }
    response = requests.post(url, params=params)
    return response.json()["access_token"]
```

## books_service.py

``` python
import requests
from oauth import refresh_access_token

def get_invoices(org_id):
    token = refresh_access_token()
    headers = {
        "Authorization": f"Zoho-oauthtoken {token}"
    }
    params = {
        "organization_id": org_id
    }
    url = "https://www.zohoapis.com/books/v3/invoices"
    response = requests.get(url, headers=headers, params=params)
    return response.json()
```
