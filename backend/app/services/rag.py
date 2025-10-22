from __future__ import annotations
from typing import List, Dict, Optional, Tuple
import os, json
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

from .embeddings import embed_texts

# Ruta base del índice
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAG_DIR = os.path.join(BASE_DIR, "..", "rag_store")
os.makedirs(RAG_DIR, exist_ok=True)

INDEX_PATH = os.path.join(RAG_DIR, "index.faiss")
VEC_PATH   = os.path.join(RAG_DIR, "vectors.npy")    # por si quieres guardar/inspeccionar
META_PATH  = os.path.join(RAG_DIR, "meta.json")      # lista de {"text":..., "source":...}

class RagStore:
    def __init__(self):
        self.index = None
        self.meta: List[Dict] = []
        self.dim = None

    def loaded(self) -> bool:
        return self.index is not None and len(self.meta) > 0

    def load(self) -> bool:
        if faiss is None:
            return False
        if not (os.path.exists(INDEX_PATH) and os.path.exists(META_PATH)):
            return False
        self.index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            self.meta = json.load(f)
        # deducir dim
        self.dim = self.index.d
        return True

    def save(self, vectors: np.ndarray, meta: List[Dict]):
        """Guarda índice + metadatos."""
        if faiss is None:
            raise RuntimeError("FAISS no está instalado (faiss-cpu).")
        self.dim = vectors.shape[1]
        # usamos inner-product (equiv. cosine con vectores normalizados)
        index = faiss.IndexFlatIP(self.dim)
        index.add(vectors)
        faiss.write_index(index, INDEX_PATH)
        with open(META_PATH, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False)
        np.save(VEC_PATH, vectors)
        self.index = index
        self.meta = meta

    def search(self, query: str, top_k: int = 4) -> List[Dict]:
        """Devuelve lista de chunks relevantes con score."""
        if not self.loaded():
            if not self.load():
                return []
        qvec = embed_texts([query])  # (1, d)
        D, I = self.index.search(qvec, top_k)  # D: similitud (cosine approx), I: índices
        hits = []
        for idx, score in zip(I[0], D[0]):
            if idx < 0 or idx >= len(self.meta):
                continue
            item = self.meta[idx].copy()
            item["score"] = float(score)
            hits.append(item)
        return hits

    def build_from_chunks(self, chunks: List[Dict[str, str]]):
        """chunks: [{'text':..., 'source':...}, ...]"""
        texts = [c["text"] for c in chunks]
        vecs = embed_texts(texts)  # (n, d) normalizados
        self.save(vecs, chunks)

# Singleton simple
_store = RagStore()

def ensure_loaded() -> bool:
    return _store.load()

def search(query: str, top_k: int = 4) -> List[Dict]:
    return _store.search(query, top_k)

def build_index(chunks: List[Dict[str, str]]):
    _store.build_from_chunks(chunks)

def compose_context(hits: List[Dict], max_chars: int = 2000) -> str:
    """Arma un contexto concatenando trozos con su fuente."""
    parts = []
    total = 0
    for h in hits:
        snippet = h["text"].strip()
        src = h.get("source", "doc")
        block = f"[Fuente: {src}]\n{snippet}\n"
        if total + len(block) > max_chars:
            break
        parts.append(block); total += len(block)
    return "\n---\n".join(parts)
