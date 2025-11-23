from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

from app.config import get_settings
from app.db import get_database

ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


class TokenStore:
    def __init__(self, secret_key: str) -> None:
        self.secret_key = secret_key
        self.refresh_tokens: Dict[str, datetime] = {}

    def generate_tokens(self, user_id: str) -> Tuple[str, str]:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        payload = {"sub": user_id, "exp": now + timedelta(minutes=settings.access_token_ttl_minutes)}
        access_token = jwt.encode(payload, self.secret_key, algorithm=ALGORITHM)

        refresh_payload = {
            "sub": user_id,
            "type": "refresh",
            "exp": now + timedelta(minutes=settings.refresh_token_ttl_minutes),
        }
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=ALGORITHM)
        self.refresh_tokens[refresh_token] = refresh_payload["exp"]
        return access_token, refresh_token

    def verify_refresh_token(self, token: str) -> str:
        if token not in self.refresh_tokens:
            raise ValueError("Unknown refresh token")
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[ALGORITHM])
        except Exception as exc:  # pylint: disable=broad-except
            raise ValueError("Invalid refresh token") from exc
        if datetime.now(timezone.utc) > self.refresh_tokens[token]:
            raise ValueError("Refresh token expired")
        return payload["sub"]


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    return await get_user_from_token(token)


async def get_current_user_with_voice_verify(
    token: str = Depends(oauth2_scheme),
    audio_base64: str | None = None
) -> Dict:
    """Get current user and optionally verify voice for protected routes."""
    user = await get_user_from_token(token)
    
    # If voice verification is provided, verify it
    if audio_base64:
        from app.services import auth as auth_service
        voice_result = await auth_service.verify_voice(user["user_id"], audio_base64, None)
        if not voice_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Voice verification failed"
            )
    
    return user


async def get_user_from_token(token: str) -> Dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    try:
        payload = jwt.decode(token, token_store.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    database = await get_database()
    user = await database.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def generate_otp(length: int = 6) -> str:
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(length))


token_store = TokenStore(secret_key="super-secret-key")

