from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

_client: Optional[AsyncIOMotorClient] = None


async def get_database() -> AsyncIOMotorDatabase:
    global _client
    settings = get_settings()
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client[settings.mongodb_db_name]


async def seed_database() -> None:
    db = await get_database()

    if await db.users.count_documents({"user_id": "user_001"}) == 0:
        await db.users.insert_one(
            {
                "user_id": "user_001",
                "username": "demo_user",
                "full_name": "Demo Customer",
                "preferred_language": "en",
                "otp_secret": "123456",
                "voice_embedding": None,
                "balances": {"savings": 23450.0},
                "daily_limit": 50000.0,
            }
        )

    if await db.transactions.count_documents({"txn_id": "txn_001"}) == 0:
        await db.transactions.insert_one(
            {
                "txn_id": "txn_001",
                "user_id": "user_001",
                "amount": 500.0,
                "counterparty": "Rahul",
                "channel": "UPI",
                "status": "SUCCESS",
                "created_at": datetime.utcnow() - timedelta(days=1),
            }
        )

    if await db.loans.count_documents({"loan_id": "loan_001"}) == 0:
        await db.loans.insert_one(
            {
                "loan_id": "loan_001",
                "user_id": "user_001",
                "loan_type": "personal",
                "interest_rate": 11.25,
                "outstanding": 150000.0,
                "emi_due": 4500.0,
                "next_due": datetime.utcnow() + timedelta(days=10),
            }
        )

