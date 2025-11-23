from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.banking import (
    BalanceResponse,
    LoansResponse,
    ReminderListResponse,
    ReminderRequest,
    ReminderResponse,
    TransactionHistoryResponse,
    TransferConfirmRequest,
    TransferConfirmResponse,
    TransferInitRequest,
    TransferInitResponse,
)
from app.services import banking as banking_service

router = APIRouter(prefix="", tags=["banking"])


@router.get("/balance", response_model=BalanceResponse)
async def fetch_balance(
    account_type: str = "savings", current_user: dict = Depends(get_current_user)
) -> BalanceResponse:
    return await banking_service.get_balance(current_user["user_id"], account_type)


@router.post("/transfer/init", response_model=TransferInitResponse)
async def init_transfer(
    payload: TransferInitRequest, current_user: dict = Depends(get_current_user)
) -> TransferInitResponse:
    payload = payload.model_copy(update={"user_id": current_user["user_id"]})
    return await banking_service.init_transfer(payload)


@router.post("/transfer/confirm", response_model=TransferConfirmResponse)
async def confirm_transfer(
    payload: TransferConfirmRequest, current_user: dict = Depends(get_current_user)
) -> TransferConfirmResponse:
    if payload.user_id and payload.user_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User mismatch")
    txn = await banking_service.confirm_transfer(
        current_user["user_id"], payload.session_id, payload.otp, payload.voice_verified
    )
    return TransferConfirmResponse(status=txn["status"], txn_id=txn["txn_id"])


@router.get("/transactions", response_model=TransactionHistoryResponse)
async def get_transactions(
    limit: int = 5, current_user: dict = Depends(get_current_user)
) -> TransactionHistoryResponse:
    return await banking_service.get_transactions(current_user["user_id"], limit)


@router.get("/loans", response_model=LoansResponse)
async def get_loans(current_user: dict = Depends(get_current_user)) -> LoansResponse:
    return await banking_service.get_loans(current_user["user_id"])


@router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    payload: ReminderRequest, current_user: dict = Depends(get_current_user)
) -> ReminderResponse:
    return await banking_service.create_reminder(
        current_user["user_id"], payload.title, payload.schedule_iso, payload.channel
    )


@router.get("/reminders", response_model=ReminderListResponse)
async def list_reminders(current_user: dict = Depends(get_current_user)) -> ReminderListResponse:
    return await banking_service.get_reminders(current_user["user_id"])


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    await banking_service.delete_reminder(current_user["user_id"], reminder_id)
    return {"status": "deleted", "reminder_id": reminder_id}


@router.get("/offers/eligible")
async def get_eligible_offers(current_user: dict = Depends(get_current_user)) -> dict:
    return await banking_service.get_eligible_offers(current_user["user_id"])


@router.get("/reminders/due")
async def get_due_reminders(current_user: dict = Depends(get_current_user)) -> dict:
    """Get reminders that are due now or in the next few minutes (for demo purposes)."""
    return await banking_service.get_due_reminders(current_user["user_id"])