from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import get_user_from_token
from app.services import dialogue as dialogue_service


router = APIRouter()


class VoiceConnectionManager:
    def __init__(self) -> None:
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        self.connections.pop(user_id, None)

    async def send(self, user_id: str, payload: dict) -> None:
        websocket = self.connections.get(user_id)
        if websocket:
            await websocket.send_json(payload)


manager = VoiceConnectionManager()


@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket) -> None:
    user_id = None
    try:
        while True:
            payload = await websocket.receive_json()
            token = payload.get("token")
            if not token:
                await websocket.close(code=4401)
                return
            user = await get_user_from_token(token)
            user_id = user["user_id"]
            if user_id not in manager.connections:
                await manager.connect(user_id, websocket)
            response = await dialogue_service.process_voice_turn(
                user_id=user_id,
                audio_base64=payload["audio_base64"],
                language=payload.get("language", "en"),
            )
            await manager.send(user_id, response)
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)

