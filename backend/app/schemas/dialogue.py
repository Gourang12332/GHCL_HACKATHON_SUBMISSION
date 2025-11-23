from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DialogueTurn(BaseModel):
    role: str
    text: str
    confidence: float = 1.0


class DialogueResponse(BaseModel):
    text: str
    next_action: str
    metadata: Dict[str, Any] = {}
    suggestions: List[str] = []


class NavigationInstruction(BaseModel):
    route: str
    field_to_focus: Optional[str] = None
    play_tts_first: bool = False


class VoiceTurnRequest(BaseModel):
    user_id: Optional[str] = None
    audio_base64: str
    language: str = "en"
    context: Optional[str] = None  # Context like "amount", "recipient", "loans", "offers", "transactions"

