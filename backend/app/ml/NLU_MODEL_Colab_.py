
!pip install -q transformers[torch] fastapi uvicorn pyngrok nest_asyncio

NGROK_AUTH_TOKEN = "" 
# Enter the Ngrok AuTH Token

import os
import threading
import nest_asyncio
from pyngrok import ngrok
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

if NGROK_AUTH_TOKEN and NGROK_AUTH_TOKEN != "YOUR_NGROK_AUTH_TOKEN":
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)


app = FastAPI()


tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-mnli")
model = AutoModelForSequenceClassification.from_pretrained("facebook/bart-large-mnli")
pipe = pipeline("zero-shot-classification", model=model, tokenizer=tokenizer, device= -1) 


class PredictRequest(BaseModel):
    sequence: str
    candidate_labels: list[str]
    multi_label: bool = False
    hypothesis_template: str | None = None

@app.post("/classify")
def predict(req: PredictRequest):
    args = dict(multi_label=req.multi_label)
    if req.hypothesis_template:
        args["hypothesis_template"] = req.hypothesis_template
    result = pipe(req.sequence, req.candidate_labels, **args)
    return result


@app.get("/")
def root():
    return {"status": "running"}


def run_server():
    nest_asyncio.apply()
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

thread = threading.Thread(target=run_server, daemon=True)
thread.start()


public_url = ngrok.connect(8000, "http")
print("ngrok public URL:", public_url.public_url)
print("Test endpoint: {}/classify".format(public_url.public_url))
