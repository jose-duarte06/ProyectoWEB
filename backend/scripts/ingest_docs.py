import os, re, json
from pathlib import Path
from typing import List, Dict
from pypdf import PdfReader

import sys
# Hacer que `from app.services.rag import build_index` funcione si ejecutas este script
CUR = Path(__file__).resolve()
ROOT = CUR.parents[1]  # backend/
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.rag import build_index

DOCS_DIR = ROOT / "docs"

def read_txt_md(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")

def read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    texts = []
    for page in reader.pages:
        t = page.extract_text() or ""
        texts.append(t)
    return "\n".join(texts)

def clean_text(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def chunk_text(text: str, max_chars=900, overlap=150) -> List[str]:
    """Troceado simple por caracteres, conservando solapamiento."""
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + max_chars)
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
        if start < 0:
            start = 0
        if start >= n:
            break
    return chunks

def collect_chunks() -> List[Dict[str, str]]:
    chunks: List[Dict[str, str]] = []
    if not DOCS_DIR.exists():
        print(f"Docs dir {DOCS_DIR} no existe, creando...")
        DOCS_DIR.mkdir(parents=True, exist_ok=True)
        return chunks

    for path in DOCS_DIR.glob("**/*"):
        if path.is_dir():
            continue
        ext = path.suffix.lower()
        if ext not in {".pdf", ".txt", ".md"}:
            continue
        try:
            if ext == ".pdf":
                raw = read_pdf(path)
            else:
                raw = read_txt_md(path)
            raw = clean_text(raw)
            parts = chunk_text(raw, max_chars=900, overlap=150)
            for i, ch in enumerate(parts):
                chunks.append({
                    "text": ch,
                    "source": f"{path.name}#chunk{i}"
                })
            print(f"[OK] {path.name} -> {len(parts)} chunks")
        except Exception as e:
            print(f"[ERR] {path.name}: {e}")
    return chunks

def main():
    ch = collect_chunks()
    if not ch:
        print("No hay chunks. Coloca PDFs/TXT/MD en backend/docs/ y reintenta.")
        return
    print(f"Construyendo índice con {len(ch)} chunks...")
    build_index(ch)
    print("Listo. Índice guardado en app/rag_store/")

if __name__ == "__main__":
    main()
