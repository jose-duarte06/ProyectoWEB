from typing import List
import numpy as np
from ..config import OPENAI_API_KEY
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

EMBEDDING_MODEL = "text-embedding-3-small"  # barato y suficiente

_client = OpenAI(api_key=OPENAI_API_KEY) if (OpenAI and OPENAI_API_KEY) else None

def _ensure_client():
    if _client is None:
        raise RuntimeError("Embeddings: falta OPENAI_API_KEY o el paquete 'openai'.")

def embed_texts(texts: List[str]) -> np.ndarray:
    """Devuelve matriz (n, d) flotante32 normalizada."""
    _ensure_client()
    # OpenAI permite hasta ~8k tokens por item; ya troceamos antes
    resp = _client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    arr = np.array([d.embedding for d in resp.data], dtype=np.float32)
    # normalizar a norma-1 (o L2). Usamos L2 para cosine con FAISS (inner product)
    norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-12
    arr = arr / norms
    return arr
