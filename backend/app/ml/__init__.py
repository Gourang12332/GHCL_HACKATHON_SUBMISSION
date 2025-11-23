from .stt import transcribe_audio
from .nlu import infer_intent
from .tts import synthesize_speech
from .biometrics import extract_embedding, compare_embeddings

__all__ = [
    "transcribe_audio",
    "infer_intent",
    "synthesize_speech",
    "extract_embedding",
    "compare_embeddings",
]
