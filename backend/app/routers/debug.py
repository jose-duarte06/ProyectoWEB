from fastapi import APIRouter
from ..config import OPENAI_API_KEY, OPENAI_MODEL

router = APIRouter(prefix="/debug", tags=["Debug"])

@router.get("/openai")
def dbg_openai():
    return {
        "has_key": bool(OPENAI_API_KEY),
        "model": OPENAI_MODEL,
        "key_prefix": OPENAI_API_KEY[:7] + "..." if OPENAI_API_KEY else ""
    }
