# backend/app/services/doc_ingest.py
import re
from pathlib import Path
from typing import List, Dict
from pypdf import PdfReader

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

def collect_chunks(docs_dir: Path) -> List[Dict[str, str]]:
    """
    Recorre docs_dir y devuelve [{'text': ..., 'source': ...}, ...]
    soportando .pdf, .txt, .md
    """
    chunks: List[Dict[str, str]] = []
    docs_dir.mkdir(parents=True, exist_ok=True)

    for path in docs_dir.glob("**/*"):
        if path.is_dir():
            continue
        ext = path.suffix.lower()
        if ext not in {".pdf", ".txt", ".md"}:
            continue

        if ext == ".pdf":
            raw = read_pdf(path)
        else:
            raw = read_txt_md(path)

        raw = clean_text(raw)
        parts = chunk_text(raw, max_chars=900, overlap=150)
        for i, ch in enumerate(parts):
            chunks.append({"text": ch, "source": f"{path.name}#chunk{i}"})
    return chunks
