from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import seed_database
from app.routers import auth as auth_router
from app.routers import banking as banking_router
from app.routers import dialogue as dialogue_router
from app.ws import voice_socket


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router.router)
    app.include_router(banking_router.router)
    app.include_router(dialogue_router.router)
    app.include_router(voice_socket.router)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.on_event("startup")
    async def startup_event() -> None:
        await seed_database()

    return app


app = create_app()

