from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import HTTPException, status

from app.config import get_settings
from app.core.security import generate_otp, token_store
from app.db import get_database
from app.ml import compare_embeddings, extract_embedding
from app.schemas.auth import SessionState

OTP_EXPIRY_MINUTES = 5


async def login(username: str, password: str) -> Dict:
    database = await get_database()
    user = await database.users.find_one({"username": username})
    if not user or password != "bank-demo":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    otp = generate_otp()
    print(otp)
    state = SessionState(
        session_id=f"session_{user['user_id']}",
        user_id=user["user_id"],
        route="/",
        updated_at=datetime.utcnow(),
        dialog_trace=[],
    )
    await database.sessions.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "user_id": user["user_id"],
                "otp": otp,
                "otp_expires": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                "state": state.model_dump(),
            }
        },
        upsert=True,
    )
    return user


async def verify_otp_and_issue_tokens(user_id: str, otp: str) -> tuple[str, str]:
    database = await get_database()
    session = await database.sessions.find_one({"user_id": user_id})
    if (
        not session
        or session.get("otp") != otp
        or session.get("otp_expires") is None
        or session["otp_expires"] < datetime.utcnow()
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")
    access_token, refresh_token = token_store.generate_tokens(user_id)
    return access_token, refresh_token


async def enroll_voice(user_id: str, audio_base64: str) -> None:
    database = await get_database()
    user = await database.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    embedding = extract_embedding(audio_base64)
    await database.users.update_one({"user_id": user_id}, {"$set": {"voice_embedding": embedding}})


async def verify_voice(user_id: str, audio_base64: str, otp: Optional[str]) -> dict:
    database = await get_database()
    user = await database.users.find_one({"user_id": user_id})
    if not user or not user.get("voice_embedding"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice profile missing")
    new_embedding = extract_embedding(audio_base64)
    similarity = compare_embeddings(user["voice_embedding"], new_embedding)
    settings = get_settings()
    fallback_required = similarity < settings.voice_similarity_threshold or not otp
    session = await database.sessions.find_one({"user_id": user_id})
    session_otp = session.get("otp") if session else None
    if fallback_required and (not otp or otp != session_otp):
        return {"success": False, "similarity": similarity, "fallback_required": True}
    return {"success": True, "similarity": similarity, "fallback_required": fallback_required}


async def upsert_session_state(state: SessionState) -> SessionState:
    database = await get_database()
    await database.sessions.update_one(
        {"user_id": state.user_id},
        {"$set": {"state": state.model_dump()}},
        upsert=True,
    )
    return state


async def get_session_state(user_id: str) -> SessionState:
    database = await get_database()
    session = await database.sessions.find_one({"user_id": user_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session missing")
    return SessionState(**session["state"])

