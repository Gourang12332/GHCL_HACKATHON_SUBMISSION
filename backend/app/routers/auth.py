from __future__ import annotations

from fastapi import APIRouter

from app.services import auth as auth_service
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenRequest,
    TokenResponse,
    VoiceEnrollRequest,
    VoiceVerifyRequest,
    VoiceVerifyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    user = await auth_service.login(payload.username, payload.password)
    return LoginResponse(user_id=user["user_id"], otp_required=True)


@router.post("/token", response_model=TokenResponse)
async def issue_token(payload: TokenRequest) -> TokenResponse:
    from fastapi import HTTPException, status
    
    # Both OTP and voice verification are REQUIRED
    if not payload.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP is required for login"
        )
    
    if not payload.audio_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice verification is required for login"
        )
    
    # Verify voice first
    voice_result = await auth_service.verify_voice(payload.user_id, payload.audio_base64, payload.otp)
    if not voice_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Voice verification failed. Please try again."
        )
    
    # Verify OTP
    access_token, refresh_token = await auth_service.verify_otp_and_issue_tokens(payload.user_id, payload.otp)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=600)


@router.post("/voice/enroll")
async def enroll_voice(payload: VoiceEnrollRequest) -> dict:
    await auth_service.enroll_voice(payload.user_id, payload.audio_base64)
    return {"status": "enrolled"}


@router.post("/voice/verify", response_model=VoiceVerifyResponse)
async def verify_voice(payload: VoiceVerifyRequest) -> VoiceVerifyResponse:
    result = await auth_service.verify_voice(payload.user_id, payload.audio_base64, payload.otp)
    return VoiceVerifyResponse(**result)

