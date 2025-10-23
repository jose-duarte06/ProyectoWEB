# backend/app/services/rag.py
# --- NEW: RAG con OpenAI embeddings + FAISS ---
from __future__ import annotations
import json
from pathlib import Path
from typing import List, Dict, Tuple

import faiss
import numpy as np
from openai import OpenAI

from ..config import OPENAI_API_KEY

# Rutas para índice y metadatos
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
INDEX_PATH = DATA_DIR / "rag.index"
META_PATH  = DATA_DIR / "rag.meta.json"

# Modelo de embeddings (barato y suficiente)
EMBED_MODEL = "text-embedding-3-small"

_client: OpenAI | None = None
_index: faiss.IndexFlatIP | None = None
_meta: List[Dict] = []

def _client_ok() -> bool:
    return bool(OPENAI_API_KEY and isinstance(OPENAI_API_KEY, str) and len(OPENAI_API_KEY) > 0)

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not _client_ok():
            raise RuntimeError("OPENAI_API_KEY no configurada")
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client

def _embed_texts(texts: List[str]) -> np.ndarray:
    """
    --- NEW: genera embeddings con OpenAI (shape: [N, D]) normalizados para IP ---
    """
    if not texts:
        return np.zeros((0, 1536), dtype="float32")  # tamaño no importa si vacío
    client = _get_client()

    # La API 1.x: client.embeddings.create(model=..., input=[...])
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    vecs = np.array([d.embedding for d in resp.data], dtype="float32")

    # Normalizar a unidad para usar IndexFlatIP como cos-sim
    norms = np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-12
    vecs = vecs / norms
    return vecs

def _save_index(index: faiss.IndexFlatIP, meta: List[Dict]) -> None:
    faiss.write_index(index, str(INDEX_PATH))
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

def _load_index() -> Tuple[faiss.IndexFlatIP | None, List[Dict]]:
    if not INDEX_PATH.exists() or not META_PATH.exists():
        return None, []
    try:
        idx = faiss.read_index(str(INDEX_PATH))
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        return idx, meta
    except Exception:
        return None, []

def ensure_loaded() -> bool:
    """
    --- NEW: carga índice/metadata a memoria si existen ---
    """
    global _index, _meta
    if _index is not None and _meta:
        return True
    idx, meta = _load_index()
    if idx is None or not meta:
        _index = None
        _meta = []
        return False
    _index = idx
    _meta = meta
    return True

def build_index(chunks: List[Dict]) -> None:
    """
    --- NEW: reconstruye el índice desde chunks [{id, text, meta}] ---
    """
    if not chunks:
        raise RuntimeError("No hay chunks para indexar")

    texts = [c["text"] for c in chunks]
    vecs = _embed_texts(texts)  # [N, D]

    # FAISS IP (dot product) con vectores normalizados ~ cos-sim
    d = vecs.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(vecs)

    _save_index(index, chunks)

    # refresca en memoria
    global _index, _meta
    _index = index
    _meta = chunks

def search(query: str, top_k: int = 4) -> List[Dict]:
    """
    --- NEW: búsqueda; retorna hits con score y metadata ---
    """
    if not ensure_loaded():
        return []
    if not query.strip():
        return []

    qv = _embed_texts([query])  # [1, D]
    D, I = _index.search(qv, top_k)  # scores y posiciones

    hits = []
    for score, idx in zip(D[0].tolist(), I[0].tolist()):
        if idx < 0 or idx >= len(_meta):
            continue
        item = _meta[idx]
        hits.append({
            "score": float(score),
            "id": item.get("id"),
            "text": item.get("text"),
            "meta": item.get("meta", {})
        })
    return hits

def compose_context(hits: List[Dict], sep: str = "\n\n---\n\n") -> str:
    """
    --- NEW: compone un contexto “pegado” para pasar al prompt del asistente ---
    """
    if not hits:
        return ""
    parts = []
    for h in hits:
        fn = h.get("meta", {}).get("filename", "doc")
        parts.append(f"[{fn}] {h['text']}")
    return sep.join(parts)
