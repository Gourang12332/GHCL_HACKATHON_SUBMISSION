from __future__ import annotations

import base64
import hashlib
from typing import List


def extract_embedding(audio_base64: str) -> List[float]:
    decoded = base64.b64decode(audio_base64.encode(), validate=True)
    digest = hashlib.sha256(decoded).digest()
    # Convert digest to float vector
    return [int(b) / 255 for b in digest[:16]]


def compare_embeddings(emb_a: List[float], emb_b: List[float]) -> float:
    if not emb_a or not emb_b:
        return 0.0
    numerator = sum(a * b for a, b in zip(emb_a, emb_b))
    denom_a = sum(a * a for a in emb_a) ** 0.5
    denom_b = sum(b * b for b in emb_b) ** 0.5
    if denom_a == 0 or denom_b == 0:
        return 0.0
    return numerator / (denom_a * denom_b)

