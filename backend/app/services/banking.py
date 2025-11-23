from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import HTTPException, status

from app.config import get_settings
from app.db import get_database
from app.schemas.banking import (
    BalanceResponse,
    LoansResponse,
    LoansResponseItem,
    ReminderItem,
    ReminderListResponse,
    ReminderResponse,
    TransactionHistoryResponse,
    TransactionItem,
    TransferInitRequest,
    TransferInitResponse,
)


async def get_balance(user_id: str, account_type: str = "savings") -> BalanceResponse:
    database = await get_database()
    user = await database.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    balances = user.get("balances", {})
    balance = balances.get(account_type)
    if balance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account missing")
    return BalanceResponse(account_type=account_type, balance=balance, last_updated=datetime.utcnow())


async def init_transfer(payload: TransferInitRequest) -> TransferInitResponse:
    settings = get_settings()
    database = await get_database()
    user = await database.users.find_one({"user_id": payload.user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.amount > user.get("daily_limit", 0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount exceeds limit")
    mfa_required = payload.amount >= settings.mfa_required_amount
    session_id = f"transfer_{payload.user_id}_{datetime.utcnow().timestamp()}"
    session_payload = {
        "session_id": session_id,
        "payload": payload.model_dump(),
        "mfa_required": mfa_required,
    }
    update_result = await database.sessions.update_one(
        {"user_id": payload.user_id},
        {"$set": {"transfer_session": session_payload}},
        upsert=False,
    )
    if update_result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session missing")
    summary = f"{payload.amount} to {payload.counterparty} via {payload.channel}"
    return TransferInitResponse(summary=summary, mfa_required=mfa_required, session_id=session_id)


async def confirm_transfer(user_id: str, session_id: str, otp: str | None, voice_verified: bool) -> dict:
    database = await get_database()
    session = await database.sessions.find_one({"user_id": user_id})
    transfer_session = session.get("transfer_session") if session else None
    if not transfer_session or transfer_session.get("session_id") != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer session missing")
    if transfer_session.get("mfa_required") and not (voice_verified or otp):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="MFA required")
    payload_dict = transfer_session["payload"]
    payload = TransferInitRequest(**payload_dict)
    txn_id = f"txn_{int(datetime.utcnow().timestamp())}"
    txn_doc = {
        "txn_id": txn_id,
        "user_id": user_id,
        "amount": payload.amount,
        "counterparty": payload.counterparty,
        "channel": payload.channel,
        "status": "SUCCESS",
        "created_at": datetime.utcnow(),
    }
    await database.transactions.insert_one(txn_doc)
    await database.users.update_one({"user_id": user_id}, {"$inc": {"balances.savings": -payload.amount}})
    await database.sessions.update_one({"user_id": user_id}, {"$unset": {"transfer_session": ""}})
    return txn_doc


async def get_transactions(user_id: str, limit: int = 5) -> TransactionHistoryResponse:
    database = await get_database()
    cursor = (
        database.transactions.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    items: List[TransactionItem] = [
        TransactionItem(
            txn_id=doc["txn_id"],
            amount=doc["amount"],
            counterparty=doc["counterparty"],
            channel=doc["channel"],
            status=doc["status"],
            created_at=doc["created_at"],
        )
        async for doc in cursor
    ]
    return TransactionHistoryResponse(transactions=items)


async def get_loans(user_id: str) -> LoansResponse:
    database = await get_database()
    cursor = database.loans.find({"user_id": user_id})
    loans: List[LoansResponseItem] = [
        LoansResponseItem(
            loan_id=doc["loan_id"],
            loan_type=doc["loan_type"],
            interest_rate=doc["interest_rate"],
            outstanding=doc["outstanding"],
            emi_due=doc["emi_due"],
            next_due=doc["next_due"],
        )
        async for doc in cursor
    ]
    return LoansResponse(loans=loans)


async def create_reminder(user_id: str, title: str, schedule_iso: str, channel: str) -> ReminderResponse:
    database = await get_database()
    reminder_id = f"rem_{int(datetime.utcnow().timestamp())}"
    reminder_doc = {
        "reminder_id": reminder_id,
        "user_id": user_id,
        "title": title,
        "schedule_iso": schedule_iso,
        "channel": channel,
        "created_at": datetime.utcnow(),
    }
    await database.reminders.insert_one(reminder_doc)
    return ReminderResponse(reminder_id=reminder_id, next_run=schedule_iso)


async def get_reminders(user_id: str) -> ReminderListResponse:
    database = await get_database()
    cursor = database.reminders.find({"user_id": user_id}).sort("schedule_iso", 1)
    reminders: List[ReminderItem] = [
        ReminderItem(
            reminder_id=doc["reminder_id"],
            title=doc["title"],
            schedule_iso=doc["schedule_iso"],
            channel=doc["channel"],
            created_at=doc["created_at"],
        )
        async for doc in cursor
    ]
    return ReminderListResponse(reminders=reminders)


async def delete_reminder(user_id: str, reminder_id: str) -> None:
    database = await get_database()
    result = await database.reminders.delete_one({"user_id": user_id, "reminder_id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")


async def get_due_reminders(user_id: str) -> dict:
    """Get reminders that are due now or in the next few minutes (for demo purposes)."""
    from datetime import timedelta
    
    database = await get_database()
    now = datetime.utcnow()
    # Check reminders due in the next 5 minutes (for demo, we check within 5 minutes)
    future_time = now + timedelta(minutes=5)
    
    cursor = database.reminders.find({"user_id": user_id}).sort("schedule_iso", 1)
    
    due_reminders: List[ReminderItem] = []
    async for doc in cursor:
        try:
            # Parse the schedule_iso string to datetime
            schedule_str = doc["schedule_iso"]
            # Handle both with and without timezone
            if schedule_str.endswith("Z"):
                schedule_str = schedule_str[:-1] + "+00:00"
            elif "+" not in schedule_str and "Z" not in schedule_str:
                # Assume UTC if no timezone
                schedule_str = schedule_str + "+00:00"
            
            schedule_time = datetime.fromisoformat(schedule_str)
            # Convert to naive UTC datetime for comparison
            if schedule_time.tzinfo:
                from datetime import timezone
                schedule_time = schedule_time.astimezone(timezone.utc).replace(tzinfo=None)
            
            # Check if reminder is due (within 5 minutes window)
            if now <= schedule_time <= future_time:
                due_reminders.append(ReminderItem(
                    reminder_id=doc["reminder_id"],
                    title=doc["title"],
                    schedule_iso=doc["schedule_iso"],
                    channel=doc["channel"],
                    created_at=doc["created_at"],
                ))
        except Exception as e:
            print(f"Error parsing reminder schedule: {e}")
            continue
    
    return {"reminders": due_reminders, "count": len(due_reminders)}


async def get_eligible_offers(user_id: str) -> dict:
    """Get eligible loans and bank offers for the user."""
    database = await get_database()
    user = await database.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    balance = user.get("balances", {}).get("savings", 0)
    credit_score = user.get("credit_score", 650)  # Default credit score
    
    eligible_loans = []
    eligible_offers = []
    
    # Personal Loan eligibility
    if credit_score >= 650 and balance >= 10000:
        eligible_loans.append({
            "type": "Personal Loan",
            "max_amount": 500000,
            "interest_rate": 10.5,
            "tenure_years": 5,
            "eligibility_score": "High",
            "description": "Get instant personal loan up to ₹5 Lakhs"
        })
    
    # Home Loan eligibility
    if credit_score >= 700:
        eligible_loans.append({
            "type": "Home Loan",
            "max_amount": 5000000,
            "interest_rate": 8.75,
            "tenure_years": 20,
            "eligibility_score": "High",
            "description": "Affordable home loan with flexible repayment"
        })
    
    # Car Loan eligibility
    if credit_score >= 650:
        eligible_loans.append({
            "type": "Car Loan",
            "max_amount": 1500000,
            "interest_rate": 9.25,
            "tenure_years": 7,
            "eligibility_score": "Medium",
            "description": "Drive your dream car with our car loan"
        })
    
    # Credit Card offers
    if credit_score >= 700:
        eligible_offers.append({
            "type": "Premium Credit Card",
            "benefits": ["5% cashback on dining", "Airport lounge access", "Zero annual fee"],
            "credit_limit": 200000,
            "description": "Exclusive premium credit card with amazing benefits"
        })
    
    # Savings account offers
    if balance >= 50000:
        eligible_offers.append({
            "type": "Premium Savings Account",
            "benefits": ["Higher interest rate", "Free ATM transactions", "Personal relationship manager"],
            "description": "Upgrade to premium savings account"
        })
    
    # Investment offers
    if balance >= 100000:
        eligible_offers.append({
            "type": "Fixed Deposit",
            "benefits": ["7.5% annual interest", "Flexible tenure", "Tax benefits"],
            "min_amount": 10000,
            "description": "Secure your future with high-yield fixed deposits"
        })
    
    return {
        "loans": eligible_loans,
        "offers": eligible_offers,
        "credit_score": credit_score,
        "balance": balance
    }
