from __future__ import annotations

import re
from typing import Dict, Optional

import httpx

from app.config import get_settings

_FALLBACK_KEYWORDS = {
    "transfer": ["transfer", "send", "pay"],
    "balance": ["balance", "funds"],
    "history": ["history", "transactions"],
    "loan": ["loan", "emi"],
    "reminder": ["remind", "alert"],
}

# Intent classification labels
_INTENT_LABELS = ["Transfer", "balance", "history", "loan", "reminder"]


def infer_intent(transcript: str) -> Dict:
    """Use Facebook BART model for intent classification with scoring."""
    # Use Facebook model as primary method
    try:
        result = _call_facebook_model(transcript)
        if result:
            print(f"nlu result (facebook): {result}")
            return result
    except Exception as e:
        print(f"Facebook model error: {e}")
        # Fallback to keyword matching if model fails
        return _fallback_inference(transcript)
    
    # Fallback if no result
    return _fallback_inference(transcript)


def _call_facebook_model(transcript: str) -> Optional[Dict]:
    """Call external NLU API for intent classification with scoring.
    
    Returns format: {'sequence': '...', 'labels': [...], 'scores': [...]}
    Example: {'sequence': 'Transfer money 1000 , i have low balance', 
              'labels': ['Transfer', 'balance'], 
              'scores': [0.687371551990509, 0.31262844800949097]}
    """
    settings = get_settings()
    try:
        # Call the external API endpoint
        response = httpx.post(
            settings.nlu_api_url,
            json={
                "text": transcript,
                "labels": _INTENT_LABELS
            },
            headers={"Content-Type": "application/json"},
            timeout=10.0
        )
        response.raise_for_status()
        result = response.json()
        
        # Handle different possible response formats
        # Format 1: Direct result with labels and scores
        if "labels" in result and "scores" in result:
            labels = result["labels"]
            scores = result["scores"]
        # Format 2: Nested result
        elif "result" in result and "labels" in result["result"]:
            labels = result["result"]["labels"]
            scores = result["result"]["scores"]
        # Format 3: Different field names
        elif "intent" in result or "classification" in result:
            # If API returns a different format, try to adapt
            if "intent" in result:
                intent_label = result.get("intent", "").lower()
                confidence = result.get("confidence", 0.8)
                labels = [intent_label]
                scores = [confidence]
            else:
                return None
        else:
            return None
        
        # Get the highest scoring intent
        if not labels or not scores:
            return None
        
        best_idx = 0
        best_score = scores[0]
        for i, score in enumerate(scores):
            if score > best_score:
                best_score = score
                best_idx = i
        
        intent_label = labels[best_idx].lower()
        
        # Extract slots
        slots = {}
        amount = _extract_amount(transcript)
        if amount:
            slots["amount"] = amount
        
        counterparty = _extract_counterparty(transcript)
        if counterparty:
            slots["counterparty"] = counterparty
        
        return {
            "intent": intent_label,
            "slots": slots,
            "confidence": best_score,
            "all_scores": {label: score for label, score in zip(labels, scores)}
        }
    except Exception as e:
        print(f"Error calling NLU API: {e}")
        return None


def _fallback_inference(transcript: str) -> Dict:
    """
    Enhanced fallback inference that provides hardcoded responses for complete transaction flow.
    Simulates AI understanding of banking commands when NLU API is unavailable.
    """
    lower = transcript.lower()
    slots = {}
    
    # Enhanced amount extraction - handles word-based numbers
    amount = _extract_amount(transcript)
    if not amount:
        amount = _extract_amount_from_words(transcript)
    if amount:
        slots["amount"] = amount
    
    # Enhanced counterparty extraction
    counterparty = _extract_counterparty(transcript)
    if counterparty:
        slots["counterparty"] = counterparty
    
    # Enhanced intent detection with better keyword matching
    intent_detected = None
    confidence = 0.7  # Higher confidence for fallback since we're simulating
    
    # Check for transfer intent (most common for transaction flow)
    transfer_keywords = ["transfer", "send", "pay", "money", "rupees", "rupee"]
    if any(keyword in lower for keyword in transfer_keywords):
        intent_detected = "transfer"
        # If we have amount or counterparty, increase confidence
        if amount or counterparty:
            confidence = 0.85
    
    # Check other intents
    if not intent_detected:
        for intent, keywords in _FALLBACK_KEYWORDS.items():
            if any(keyword in lower for keyword in keywords):
                intent_detected = intent
                break
    
    # Default to transfer if we have transaction-related slots
    if not intent_detected and (amount or counterparty):
        intent_detected = "transfer"
        confidence = 0.75
    
    # Final fallback
    if not intent_detected:
        intent_detected = "smalltalk"
        confidence = 0.5
    
    print(f"[FALLBACK NLU] Intent: {intent_detected}, Slots: {slots}, Confidence: {confidence}")
    
    return {
        "intent": intent_detected,
        "slots": slots,
        "confidence": confidence,
    }


def _extract_amount_from_words(text: str) -> Optional[float]:
    """Extract amount from word-based numbers (e.g., 'five thousand', 'ten thousand')."""
    lower = text.lower()
    
    # Word to number mapping
    word_numbers = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
        "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
        "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
        "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
    }
    
    # Try to find patterns like "five thousand", "ten thousand", etc.
    words = lower.split()
    number = 0
    temp = 0
    
    for word in words:
        if word in word_numbers:
            val = word_numbers[word]
            if val == 100:
                temp *= 100
            elif val == 1000:
                temp *= 1000
                number += temp
                temp = 0
            else:
                temp += val
        elif word in ["rupees", "rupee", "rs"]:
            number += temp
            temp = 0
    
    number += temp
    
    if number > 0:
        return float(number)
    
    return None


def _extract_amount(text: str) -> Optional[float]:
    """Extract amount from text using multiple patterns."""
    # Pattern 1: Currency symbols with numbers (₹1000, $500, etc.)
    match = re.search(r"(?:₹|\$|rs\.?|rupees?)\s?(\d+(?:,\d{3})*(?:\.\d{1,2})?)", text, re.IGNORECASE)
    if match:
        try:
            # Remove commas and convert
            amount_str = match.group(1).replace(",", "")
            return float(amount_str)
        except ValueError:
            pass
    
    # Pattern 2: Just numbers (1000, 500.50, etc.)
    match = re.search(r"\b(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:rupees?|rs\.?|₹)?\b", text, re.IGNORECASE)
    if match:
        try:
            amount_str = match.group(1).replace(",", "")
            return float(amount_str)
        except ValueError:
            pass
    
    # Pattern 3: Numbers in words (handled by _extract_amount_from_words)
    return None


def _extract_counterparty(text: str) -> Optional[str]:
    """Extract counterparty name from text (simple pattern matching)."""
    # Look for patterns like "to John", "send to Alice", "pay Bob"
    patterns = [
        r"(?:to|for|pay)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"send\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None

