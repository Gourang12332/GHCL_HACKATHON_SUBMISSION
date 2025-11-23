from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class BalanceResponse(BaseModel):
    account_type: str
    balance: float
    last_updated: datetime


class TransferInitRequest(BaseModel):
    user_id: Optional[str] = None
    amount: float
    counterparty: str
    channel: str = "UPI"
    upi: Optional[str] = None
    ifsc: Optional[str] = None
    account_number: Optional[str] = None


class TransferInitResponse(BaseModel):
    summary: str
    mfa_required: bool
    session_id: str


class TransferConfirmRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    otp: Optional[str] = None
    voice_verified: bool = False


class TransferConfirmResponse(BaseModel):
    status: str
    txn_id: str


class TransactionItem(BaseModel):
    txn_id: str
    amount: float
    counterparty: str
    channel: str
    status: str
    created_at: datetime


class TransactionHistoryResponse(BaseModel):
    transactions: List[TransactionItem]


class LoansResponseItem(BaseModel):
    loan_id: str
    loan_type: str
    interest_rate: float
    outstanding: float
    emi_due: float
    next_due: datetime


class LoansResponse(BaseModel):
    loans: List[LoansResponseItem]


class ReminderRequest(BaseModel):
    user_id: Optional[str] = None
    title: str
    schedule_iso: str
    channel: str = Field(default="push", pattern="^(push|voice|email)$")


class ReminderResponse(BaseModel):
    reminder_id: str
    next_run: str


class ReminderItem(BaseModel):
    reminder_id: str
    title: str
    schedule_iso: str
    channel: str
    created_at: datetime


class ReminderListResponse(BaseModel):
    reminders: List[ReminderItem]

