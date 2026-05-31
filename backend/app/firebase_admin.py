import json
from typing import Annotated

import firebase_admin
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth, credentials

from app.config import Settings, get_settings


def initialize_firebase(settings: Settings) -> None:
    if firebase_admin._apps:
        return

    if settings.firebase_service_account_key:
        service_account = json.loads(settings.firebase_service_account_key)
        firebase_admin.initialize_app(credentials.Certificate(service_account))


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> str:
    initialize_firebase(settings)

    if not authorization:
        if settings.allow_dev_auth:
            return "dev-user"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth header")

    if settings.allow_dev_auth and token == "dev-token":
        return "dev-user"

    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token") from exc

    return decoded["uid"]
