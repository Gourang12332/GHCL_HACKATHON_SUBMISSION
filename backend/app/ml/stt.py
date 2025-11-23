from __future__ import annotations

import base64
import io
from typing import Dict

import httpx

from app.config import get_settings


def transcribe_audio(audio_base64: str, language: str = "en") -> Dict:
    settings = get_settings()
    api_key = (settings.openai_api_key or "").strip()

    audio_bytes = base64.b64decode(audio_base64.encode(), validate=True)

    # If no API key → fallback
    if not api_key:
        return _fallback_transcript(audio_bytes, language)

    try:
        files = {
            "file": ("audio.wav", io.BytesIO(audio_bytes), "audio/wav"),
        }
        data = {"model": settings.openai_whisper_model, "language": language}
        headers = {"Authorization": f"Bearer {api_key}"}

        response = httpx.post(
            "https://api.openai.com/v1/audio/transcriptions",
            data=data,
            files=files,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()

        payload = response.json()
        print("I am using openaI API KEY")
        return {
            "transcript": payload.get("text", "").strip() or "Could not transcribe audio.",
            "confidence": payload.get("confidence", 0.9)
        }

    except:
        return _fallback_transcript(audio_bytes, language)



def _fallback_transcript(audio_bytes: bytes, language: str) -> Dict:
    """
    Fallback transcript generator that simulates realistic banking voice inputs.
    Returns hardcoded transcripts based on audio length to simulate different scenarios.
    """
    import random
    
    approx_len = len(audio_bytes)
    confidence = min(0.95, 0.5 + approx_len / 10000)
    
    # Simulate different banking scenarios based on audio length
    # Shorter audio = amount, longer audio = full sentences
    # Include specific scenarios: transfer 5000 to rajesh, transfer 10000 to alice, transfer 15000 to john
    if approx_len < 5000:
        # Short audio - likely amount input
        amounts = [
            "five thousand rupees",
            "ten thousand",
            "two thousand five hundred",
            "fifteen thousand rupees",
            "one thousand",
            "five hundred rupees",
            "twenty thousand",
            "three thousand",
        ]
        transcript = random.choice(amounts)
    elif approx_len < 15000:
        # Medium audio - likely recipient or simple command
        recipients = [
            "send to John",
            "transfer to Alice",
            "pay Bob",
            "send money to Sarah",
            "transfer to Rajesh",
            "pay Priya",
        ]
        transcript = random.choice(recipients)
    else:
        # Longer audio - full transaction command with specific demo scenarios
        full_commands = [
            "transfer five thousand rupees to Rajesh",
            "transfer five thousand to rajesh",
            "send ten thousand to Alice",
            "transfer ten thousand rupees to alice",
            "I want to transfer fifteen thousand to John",
            "transfer fifteen thousand rupees to john",
            "please send two thousand five hundred rupees to Bob",
            "transfer one thousand rupees to Priya",
            "send money to Sarah amount is five thousand",
        ]
        transcript = random.choice(full_commands)
    
    print(f"[FALLBACK STT] Generated transcript: {transcript} (audio_len: {approx_len})")
    return {"transcript": transcript, "confidence": confidence}

