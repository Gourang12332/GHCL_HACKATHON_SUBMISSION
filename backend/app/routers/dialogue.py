from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.auth import SessionState
from app.schemas.dialogue import VoiceTurnRequest
from app.services import auth as auth_service
from app.services import dialogue as dialogue_service

router = APIRouter(prefix="/dialogue", tags=["dialogue"])


@router.post("/voice-turn")
async def voice_turn(payload: VoiceTurnRequest, current_user: dict = Depends(get_current_user)) -> dict:
    return await dialogue_service.process_voice_turn(
        current_user["user_id"], 
        payload.audio_base64, 
        payload.language,
        payload.context
    )


@router.get("/session/{user_id}", response_model=SessionState)
async def get_session(user_id: str, current_user: dict = Depends(get_current_user)) -> SessionState:
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other sessions")
    return await auth_service.get_session_state(user_id)

