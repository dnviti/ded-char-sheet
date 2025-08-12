import os
import httpx
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..db import get_collection_gemini_usage
from ..users import User
from ..auth import current_user

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

QUOTAS = {
    "free": 5,
    "premium": 20,
}

class GeminiRequest(BaseModel):
    prompt: str
    json_schema: Optional[Dict[str, Any]] = None
    is_image: bool = False

@router.post("/proxy")
async def gemini_proxy(request: GeminiRequest, user: User = Depends(current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured on the server")

    # Quota Check
    user_package = user.package or "free"
    quota = QUOTAS.get(user_package, 0)
    if user.generation_count >= quota:
        raise HTTPException(status_code=429, detail=f"Usage limit of {quota} generations for '{user_package}' package exceeded.")

    if request.is_image:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={GEMINI_API_KEY}"
        payload = {"instances": [{"prompt": request.prompt}], "parameters": {"sampleCount": 1}}
    else:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": request.prompt}]}]
        }
        if request.json_schema:
            payload["generationConfig"] = {
                "responseMimeType": "application/json",
                "responseSchema": request.json_schema
            }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload, timeout=45.0)
            response.raise_for_status()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Error contacting Gemini API: {exc}")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Gemini API: {exc.response.text}")

    # Log successful usage and increment user's count
    usage_collection = get_collection_gemini_usage()
    await usage_collection.insert_one({
        "user_id": user.id,
        "timestamp": datetime.datetime.utcnow(),
        "type": "image" if request.is_image else "text",
    })

    user.generation_count += 1
    await user.save()

    return response.json()
