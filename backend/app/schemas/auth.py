from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    user_id: str
    otp_required: bool = True


class TokenRequest(BaseModel):
    user_id: str
    otp: str
    audio_base64: str  # Required voice verification during login
    device_token: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Seconds until access token expiry")


class VoiceEnrollRequest(BaseModel):
    user_id: str
    audio_base64: str


class VoiceVerifyRequest(BaseModel):
    user_id: str
    audio_base64: str
    otp: Optional[str] = None


class VoiceVerifyResponse(BaseModel):
    success: bool
    similarity: float
    fallback_required: bool


class SessionState(BaseModel):
    session_id: str
    user_id: str
    route: str
    field_to_focus: Optional[str] = None
    updated_at: datetime
    dialog_trace: List[str] = []

