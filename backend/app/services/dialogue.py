from __future__ import annotations

from datetime import datetime
from typing import Dict

from app.db import get_database
from app.ml import infer_intent, synthesize_speech, transcribe_audio
from app.schemas.auth import SessionState
from app.schemas.dialogue import DialogueResponse


async def process_voice_turn(user_id: str, audio_base64: str, language: str = "en", context: str | None = None) -> Dict:
    stt_result = transcribe_audio(audio_base64, language)
    transcript = stt_result["transcript"]
    print(f"[DIALOGUE] Context: {context}, Transcript: {transcript}")
    
    # If context is provided for field-specific queries, provide immediate field explanations
    if context == "amount":
        response_text = "This is the amount field. You can say an amount like 'one thousand rupees' or 'five thousand'. For example, I'll suggest ₹1000 as a demo amount. Please speak your desired amount."
        tts = synthesize_speech(response_text, language)
        return {
            "transcript": transcript,
            "intent": "transfer",
            "slots": {},
            "dialogue": DialogueResponse(
                text=response_text,
                next_action="collect_transfer_details",
                metadata={"route": "/transfer", "confidence": 1.0},
                suggestions=["Use last amount", "Enter manually"],
            ).model_dump(),
            "tts": tts,
            "confidence": 1.0,
        }
    elif context == "recipient":
        # Auto-fill demo UPI ID for recipient field
        demo_upi = "rajesh@paytm"
        response_text = f"This is the recipient field for UPI ID. You can say a name like 'rajesh' or 'alice'. I'll fill a demo UPI ID: {demo_upi} as an example. Please speak the recipient name or UPI ID."
        tts = synthesize_speech(response_text, language)
        return {
            "transcript": transcript,
            "intent": "transfer",
            "slots": {"counterparty": demo_upi},  # Auto-fill the demo UPI ID
            "dialogue": DialogueResponse(
                text=response_text,
                next_action="collect_transfer_details",
                metadata={"route": "/transfer", "confidence": 1.0},
                suggestions=["Use last beneficiary", "Enter manually"],
            ).model_dump(),
            "tts": tts,
            "confidence": 1.0,
        }
    
    nlu = infer_intent(transcript)
    
    # Handle new NLU format with confidence scores
    intent = nlu.get("intent", "smalltalk")
    slots = nlu.get("slots", {})
    confidence = nlu.get("confidence", 0.5)
    
    next_action = _decide_action(intent)
    response_text = _generate_response({"intent": intent, "slots": slots}, next_action, context)
    tts = synthesize_speech(response_text, language)
    await _append_trace(user_id, transcript, response_text)
    dialogue = DialogueResponse(
        text=response_text,
        next_action=next_action,
        metadata={"route": _route_for_intent(intent), "confidence": confidence},
        suggestions=_suggestions_for_intent(intent),
    )
    return {
        "transcript": transcript,
        "intent": intent,
        "slots": slots,
        "dialogue": dialogue.model_dump(),
        "tts": tts,
        "confidence": confidence,
    }


def _decide_action(intent: str) -> str:
    mapping = {
        "transfer": "collect_transfer_details",
        "balance": "show_balance",
        "history": "show_history",
        "loan": "show_loans",
        "reminder": "setup_reminder",
    }
    return mapping.get(intent, "smalltalk")


def _generate_response(nlu: Dict, action: str, context: str | None = None) -> str:
    """
    Enhanced response generation with hardcoded responses for complete transaction flow.
    Provides helpful AI responses that guide users through banking operations.
    """
    intent = nlu["intent"]
    slots = nlu.get("slots", {})
    amount = slots.get("amount")
    counterparty = slots.get("counterparty")
    
    print(f"[DIALOGUE] Intent: {intent}, Slots: {slots}")
    
    # Transfer intent with comprehensive responses
    if intent == "transfer":
        if amount and counterparty:
            # Full transfer request - suggest clicking transfer button
            return f"Perfect! I understand you want to transfer ₹{amount:.2f} to {counterparty}. Please click on the 'Transfer Money' button on the dashboard to proceed. I'll guide you through filling the form once you're there!"
        elif amount:
            # Amount detected - provide guided response for amount field
            # Use predefined demo amounts for better UX
            demo_amounts = {
                5000: 1000,
                10000: 2000,
                15000: 3000,
            }
            suggested_amount = demo_amounts.get(int(amount), 1000)
            return f"Great! I detected an amount of ₹{amount:.2f}. For the amount field, I suggest filling ₹{suggested_amount} rupees. Please confirm if this amount is correct, or you can modify it. Once confirmed, I'll help you with the recipient field."
        elif counterparty:
            # Counterparty detected - provide demo UPI ID
            demo_upi_ids = {
                "rajesh": "rajesh@paytm",
                "alice": "alice@phonepe",
                "john": "john@upi",
                "priya": "priya@paytm",
                "bob": "bob@phonepe",
                "sarah": "sarah@upi",
            }
            counterparty_lower = counterparty.lower()
            demo_upi = demo_upi_ids.get(counterparty_lower, "demo@paytm")
            return f"Got it! I'll help you send money to {counterparty}. For the recipient field, I've filled a demo UPI ID: {demo_upi}. Please fill a similar UPI ID for {counterparty} (like {counterparty_lower}@paytm or {counterparty_lower}@phonepe). Now, please tell me the amount you want to transfer, or click the voice button on the amount field."
        else:
            return "I'm ready to help you transfer money. Please tell me the amount and recipient, or use the voice buttons on each field. For example, say 'five thousand rupees' for amount or 'send to John' for recipient."
    
    # Balance intent
    if intent == "balance":
        return "I'm checking your account balance now. One moment please..."
    
    # History intent
    if intent == "history":
        return "I'll fetch your recent transaction history right away. This page shows all your past transactions including transfers, payments, and deposits. You can see the amount, recipient, payment method, and status of each transaction."
    
    # Loan intent
    if intent == "loan":
        return "Let me retrieve your current loan details and EMI schedule. This page displays all your active loans including home loans, car loans, and personal loans. You can see the outstanding amount, EMI due, interest rate, and next due date for each loan."
    
    # Reminder intent
    if intent == "reminder":
        return "I can help you set up a payment reminder. Please tell me what you'd like to be reminded about and when. Reminders help you never miss important payments like credit card bills, loan EMIs, or utility bills."
    
    # Default smalltalk
    return "I'm here to help with your banking needs. You can transfer money, check your balance, view transactions, manage loans, or set reminders. What would you like to do?"


def _route_for_intent(intent: str) -> str:
    return {
        "transfer": "/transfer",
        "balance": "/balance",
        "history": "/transactions",
        "loan": "/loans",
        "reminder": "/reminders",
    }.get(intent, "/home")


def _suggestions_for_intent(intent: str) -> list[str]:
    return {
        "transfer": ["Use last beneficiary", "Validate IFSC"],
        "balance": ["Show last statement"],
        "history": ["Filter by last week"],
        "loan": ["Show EMI schedule"],
        "reminder": ["Make it recurring"],
    }.get(intent, ["Transfer money", "Check balance"])


async def _append_trace(user_id: str, user_utterance: str, assistant_reply: str) -> None:
    database = await get_database()
    session_doc = await database.sessions.find_one({"user_id": user_id})
    if session_doc and session_doc.get("state"):
        session = SessionState(**session_doc["state"])
    else:
        session = SessionState(
            session_id=f"session_{user_id}",
            user_id=user_id,
            route="/",
            updated_at=datetime.utcnow(),
            dialog_trace=[],
        )
    session.dialog_trace.append(f"user:{user_utterance}")
    session.dialog_trace.append(f"assistant:{assistant_reply}")
    session.updated_at = datetime.utcnow()
    await database.sessions.update_one(
        {"user_id": user_id},
        {"$set": {"state": session.model_dump()}},
        upsert=True,
    )

