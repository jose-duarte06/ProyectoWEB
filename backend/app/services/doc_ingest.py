# backend/app/services/doc_ingest.py
# --- NEW: lector simple de PDF/TXT/MD + chunking ---
from __future__ import annotations
from pathlib import Path
from typing import List, Dict
from pypdf import PdfReader

DOC_EXTS = {".pdf", ".txt", ".md"}

def read_txt_md(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return path.read_text(encoding="latin-1", errors="ignore")

def read_pdf(path: Path) -> str:
    out = []
    reader = PdfReader(str(path))
    for page in reader.pages:
        t = page.extract_text() or ""
        out.append(t)
    return "\n".join(out)

def chunk_text(text: str, max_len: int = 800, overlap: int = 120) -> List[str]:
    """
    --- NEW: chunking super simple por ventana deslizante ---
    max_len: tamaño de chunk aproximado en caracteres
    overlap: solape entre chunks para contexto
    """
    text = " ".join(text.split())
    if not text:
        return []
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_len, n)
        # intenta cortar en espacio para no partir palabras
        if end < n:
            space = text.rfind(" ", start + int(max_len * 0.6), end)
            if space != -1:
                end = space
        chunks.append(text[start:end].strip())
        if end == n:
            break
        start = max(0, end - overlap)
    return [c for c in chunks if c]

def collect_chunks(docs_dir: Path) -> List[Dict]:
    """
    --- NEW: recorre backend/docs y produce [{id, text, meta}, ...] ---
    """
    docs_dir.mkdir(parents=True, exist_ok=True)
    items: List[Dict] = []

    for path in docs_dir.glob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in DOC_EXTS:
            continue

        if path.suffix.lower() == ".pdf":
            full = read_pdf(path)
        else:
            full = read_txt_md(path)

        parts = chunk_text(full, max_len=900, overlap=150)
        for i, ch in enumerate(parts):
            items.append({
                "id": f"{path.name}::chunk{i}",
                "text": ch,
                "meta": {"filename": path.name, "chunk_index": i}
            })

    return items
