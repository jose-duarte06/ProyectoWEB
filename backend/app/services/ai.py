from typing import List, Dict, Optional
from openai import OpenAI
from ..config import OPENAI_API_KEY, OPENAI_MODEL

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

SYSTEM_PROMPT = (
    "Eres un asistente de soporte de una tienda online. "
    "Responde claro, amable y conciso. Si no sabes algo, dilo y deriva a un humano."
    "Cualquier otra pregunta fuera del negocio del sistema deberas de responder, literalmente :no poseo esa informacion"
)

def ask_openai(messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
    """
    messages: [{"role":"system|user|assistant","content":"..."}]
    context: texto opcional (RAG) que se adjunta al prompt del sistema
    """
    if client is None:
        raise RuntimeError("OPENAI_API_KEY no configurado")
    sys = SYSTEM_PROMPT if not context else f"{SYSTEM_PROMPT}\n\nContexto:\n{context}"
    msgs = [{"role": "system", "content": sys}] + messages

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=msgs,
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()
