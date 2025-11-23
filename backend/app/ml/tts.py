from __future__ import annotations

import base64
from typing import Dict

import httpx

from app.config import get_settings


def synthesize_speech(text: str, language: str = "en") -> Dict:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        return _fallback_tts(text, language)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.85},
    }
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        audio_b64 = base64.b64encode(response.content).decode()
        duration = max(1.0, len(text) / 12)
        print("ElevenLabs is speaking")
        return {"audio_base64": audio_b64, "duration_seconds": duration}
    except Exception:  # pragma: no cover - fallback
        return _fallback_tts(text, language)


def _fallback_tts(text: str, language: str) -> Dict:
    audio_payload = base64.b64encode(f"{language}:{text}".encode()).decode()
    return {"audio_base64": audio_payload, "duration_seconds": max(1.0, len(text) / 10)}

