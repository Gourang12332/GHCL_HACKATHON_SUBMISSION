# AI Voice Banking Backend

This backend bundles three cooperative layers inside a single FastAPI deployment:

1. **Main API (`app/`)** – REST routes covering authentication, balances, transfers, history, loans, reminders, and dialogue state.
2. **WebSocket layer (`app/ws/`)** – `/ws/voice` endpoint for streaming voice payloads and returning live assistant replies.
3. **ML helpers (`app/ml/`)** – Mock STT, NLU, TTS, and speaker-biometric helpers that run in-process but can later move to dedicated containers.

The layout mirrors the flow shared in the product script: speech → intent → dialog plan → validation → banking action → confirmation.

## config.py

```bash
###############################################################
### 🔥  PROJECT INFO
###############################################################
APP_NAME="AI Voice Banking Backend"
ENVIRONMENT="development"

###############################################################
### 🔥  DATABASE CONFIG
###############################################################
REDIS_URL=""
MONGODB_URI=""
MONGODB_DB_NAME="ai_voice_banking"
###############################################################
### 🔥  OPENAI CONFIG
###############################################################
OPENAI_API_KEY=""
OPENAI_WHISPER_MODEL="whisper-1"

###############################################################
### 🔥  ELEVENLABS CONFIG
###############################################################
ELEVENLABS_API_KEY=""
ELEVENLABS_VOICE_ID=""

###############################################################
### 🔥  SECURITY & AUTH
###############################################################
ACCESS_TOKEN_TTL_MINUTES=10
REFRESH_TOKEN_TTL_MINUTES=60
VOICE_SIMILARITY_THRESHOLD=0.78
MFA_REQUIRED_AMOUNT=10000.0

###############################################################
### 🔥  MOCK BANKING API
###############################################################
MOCK_BANK_API_BASE="https://mock-bank.local"

###############################################################
### 🔥  LOCAL NLU MODEL (VIA NGROK)
###############################################################
NLU_API_URL=""

```

The server exposes REST APIs on `http://localhost:8000` and WebSockets on `ws://localhost:8000/ws/voice`.

## Key endpoints

- `POST /auth/login` – password + OTP bootstrap (integrates nicely with NextAuth credentials provider).
- `POST /auth/token` – exchanges OTP for short-lived bearer tokens.
- `POST /auth/voice/enroll` / `POST /auth/voice/verify` – ECAPA-style biometric mock with cosine similarity thresholds.
- `POST /transfer/init` + `POST /transfer/confirm` – validates, enforces MFA, and logs mock transfers.
- `GET /balance`, `GET /transactions`, `GET /loans`, `POST /reminders` – supporting banking features.
- `POST /dialogue/voice-turn` – synchronous voice flow (WebSocket equivalent for short clips).
- `GET /dialogue/session/{user_id}` – retrieve dialog manager navigation hints.

## Session + dialog coordination

The `SessionState` object (persisted in MongoDB) keeps dialog traces, current route, and field focus instructions. Frontend clients (Next.js + NextAuth) should:

1. Authenticate via `/auth/login` → `/auth/token`.
2. Keep the issued `session_id` when calling `/transfer/init` or `/dialogue/voice-turn`.
3. Subscribe to `/ws/voice` for live voice chat while mirroring changes in the UI whenever the dialog manager instructs navigation.

## Extending the ML layer

All ML helpers sit under `app/ml/` with clear interfaces (`transcribe_audio`, `infer_intent`, `synthesize_speech`, `extract_embedding`). Replace the mocks with Whisper/STT, XLM-R, ECAPA, or any custom model without touching the FastAPI routers.

## Notes

- Data now persist in MongoDB via `app/db.py`. Set the `MONGODB_URI` env var (or edit `app/config.py`) with your cluster URI before running in other environments.
- ML helpers rely on external APIs:
  - `NLU_API_URL` for intent + slot inference (default model `facebook/bart-large-mnli`).
  - `OPENAI_API_KEY` for Whisper STT (configurable model name).
  - `ELEVENLABS_API_KEY` for TTS; override the `elevenlabs_voice_id` if you prefer a different speaker.
- Security helpers in `app/core/security.py` mimic OAuth-style access/refresh tokens and OTP generation. Swap in your preferred KMS/JWT secret manager.
- The structure intentionally separates REST, WS, and ML modules while keeping them deployable as a single backend service, satisfying the project constraints.

